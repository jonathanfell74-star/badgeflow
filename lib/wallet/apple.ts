// lib/wallet/apple.ts
import { PKPass } from "passkit-generator";
import QRCode from "qrcode";
import crypto from "node:crypto";

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
  const signerCert = b64ToBuffer(process.env.APPLE_SIGNER_CERT_PEM_B64);
  const signerKey = b64ToBuffer(process.env.APPLE_SIGNER_KEY_PEM_B64);
  const signerKeyPass = process.env.APPLE_SIGNER_KEY_PASSWORD || undefined;
  const wwdrCert = b64ToBuffer(process.env.APPLE_WWDR_CERT_PEM_B64);

  if (!signerCert || !signerKey || !wwdrCert) {
    throw new Error("Apple Wallet certs are missing. Check env vars.");
  }

  const serial = card.wallet_serial ?? crypto.randomUUID();
  const verifyUrl = `${baseUrl}/api/verify/${encodeURIComponent(serial)}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 480 });

  // Build Generic pass
  const pass = await PKPass.from(
    {
      model: {
        passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
        teamIdentifier: process.env.APPLE_TEAM_ID!,
        formatVersion: 1,
        organizationName: "BadgeFlow",
        description: "Staff ID",
        serialNumber: serial,
        generic: {
          primaryFields: [
            { key: "name", label: "Name", value: card.full_name || "Staff" }
          ],
          secondaryFields: [
            { key: "role", label: "Role", value: card.role || "" },
            { key: "dept", label: "Dept", value: card.department || "" }
          ],
          auxiliaryFields: [
            { key: "verify", label: "Verify", value: "Scan QR" }
          ],
          backFields: [
            {
              key: "instructions",
              label: "Verification",
              value: "Scan the QR or present to security."
            }
          ]
        },
        barcode: {
          format: "PKBarcodeFormatQR",
          message: verifyUrl,
          messageEncoding: "iso-8859-1",
          altText: "Verify"
        },
        semantics: {}
      },
      certificates: {
        signerCert: signerCert.toString("utf8"),
        signerKey: { keyFile: signerKey.toString("utf8"), passphrase: signerKeyPass },
        wwdr: wwdrCert.toString("utf8")
      }
    },
    { serialNumber: serial }
  );

  // Minimal images (swap with brand assets later)
  const blank = await QRCode.toBuffer(" ", { margin: 0, width: 10 });
  pass.images.add("icon.png", blank);
  pass.images.add("logo.png", blank);
  pass.images.add("background.png", qrPng);

  const pkpassBuffer = await pass.asBuffer();
  return { pkpassBuffer, serial, verifyUrl };
}
