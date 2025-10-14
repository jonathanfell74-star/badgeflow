// lib/wallet/apple.ts
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
  // --- Certificates (from env) ---
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

  // --- Generate a QR we’ll use as background (nice touch) ---
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 480 });

  // --- Path to your model folder (must exist with a pass.json) ---
  const modelPath = path.resolve(process.cwd(), "wallet/apple/model");

  // --- Build the pass using model + override fields here ---
  const pass = await PKPass.from(
    {
      model: modelPath,
      certificates: {
        signerCert: signerCert.toString("utf8"),
        signerKey: { keyFile: signerKey.toString("utf8"), passphrase: signerKeyPass },
        wwdr: wwdrCert.toString("utf8"),
      },
    },
    {
      // Overrides merge onto pass.json in the model folder
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      serialNumber: serial,
      description: "Staff ID",
      organizationName: "BadgeFlow",
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
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: verifyUrl,
          messageEncoding: "iso-8859-1",
          altText: "Verify",
        },
      ],
    }
  );

  // --- Images (we add at build time so model images can be minimal) ---
  // Apple requires icon/logo; we'll add simple placeholders + QR background.
  const tiny = await QRCode.toBuffer(" ", { margin: 0, width: 10 });
  pass.images.add("icon.png", tiny);
  pass.images.add("logo.png", tiny);
  pass.images.add("background.png", qrPng);

  // --- Final .pkpass buffer ---
  const pkpassBuffer = await pass.asBuffer();
  return { pkpassBuffer, serial, verifyUrl };
}
