// lib/wallet/apple.ts
export const runtime = "nodejs";

import { PKPass } from "passkit-generator";
import QRCode from "qrcode";
import crypto from "node:crypto";
import path from "node:path";

export type ManualCard = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  department?: string | null;
  company_id?: string | null;
  photo_url?: string | null;
  wallet_serial?: string | null;
  valid_until?: string | null;
};

function b64ToBuffer(b64?: string) {
  return b64 ? Buffer.from(b64, "base64") : undefined;
}

export async function issueApplePkpass(card: ManualCard, baseUrl: string) {
  // --- Certificates from env (PEM strings in base64) ---
  const signerCert = b64ToBuffer(process.env.APPLE_SIGNER_CERT_PEM_B64);
  const signerKey = b64ToBuffer(process.env.APPLE_SIGNER_KEY_PEM_B64);
  const signerKeyPass = process.env.APPLE_SIGNER_KEY_PASSWORD || undefined;
  const wwdrCert = b64ToBuffer(process.env.APPLE_WWDR_CERT_PEM_B64);
  if (!signerCert || !signerKey || !wwdrCert) {
    throw new Error("Apple Wallet certs are missing. Check env vars.");
  }

  // --- Serial + Verify URL ---
  const serial = card.wallet_serial ?? crypto.randomUUID();
  const verifyUrl = `${baseUrl}/api/verify/${encodeURIComponent(serial)}`;

  // --- Background QR (nice visual and quick test) ---
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 480 });

  // --- Path to model folder (must contain pass.json) ---
  const modelPath = path.resolve(process.cwd(), "wallet/apple/model");

  // Build overrides separately (cast to any to quiet types)
  const overrides: any = {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
    teamIdentifier: process.env.APPLE_TEAM_ID!,
    serialNumber: serial,
    description: "Staff ID",
    organizationName: "BadgeFlow",
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: verifyUrl,
        messageEncoding: "iso-8859-1",
        altText: "Verify",
      },
    ],
    generic: {
      primaryFields: [
        { key: "name", label: "Name", value: card.full_name || "Staff" },
      ],
      secondaryFields: [
        { key: "role", label: "Role", value: card.role || "" },
        { key: "dept", label: "Dept", value: card.department || "" },
      ],
      auxiliaryFields: [{ key: "verify", label: "Verify", value: "Scan QR" }],
      backFields: [
        {
          key: "instructions",
          label: "Verification",
          value: "Scan the QR or present to security.",
        },
      ],
    },
  };

  const pass = await PKPass.from(
    {
      model: modelPath,
      certificates: {
        wwdr: wwdrCert.toString("utf8"),
        signerCert: signerCert.toString("utf8"),
        signerKey: signerKey.toString("utf8"),
        signerKeyPassphrase: signerKeyPass,
      },
    },
    overrides as any
  );

  // --- Images (type defs don't expose .images; cast to any) ---
  const tiny = await QRCode.toBuffer(" ", { margin: 0, width: 10 });
  const p: any = pass;
  if (p?.images?.add) {
    p.images.add("icon.png", tiny);
    p.images.add("logo.png", tiny);
    p.images.add("background.png", qrPng);
  }

  const pkpassBuffer = await pass.asBuffer();
  return { pkpassBuffer, serial, verifyUrl };
}
