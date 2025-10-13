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

  const modelPath = path.resolve(process.cwd(), "wallet/apple/model");

  // Build the pass using a model folder +
