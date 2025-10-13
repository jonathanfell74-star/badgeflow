// lib/wallet/google.ts
import jwt from "jsonwebtoken";
import type { ManualCard } from "./apple";

function b64Json<T = any>(b64?: string): T {
  if (!b64) throw new Error("Missing base64 JSON");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

export function buildGoogleSaveUrl(card: ManualCard, baseUrl: string) {
  const sa = b64Json<{ client_email: string; private_key: string }>(
    process.env.GOOGLE_WALLET_SA_KEY_B64
  );

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = `${issuerId}.badgeflow_generic_${card.company_id || "default"}`;
  const objectId = `${issuerId}.${card.id}`;

  const verifyUrl = `${baseUrl}/api/verify/${encodeURIComponent(
    card.wallet_serial || card.id
  )}`;

  const payload = {
    iss: sa.client_email,
    aud: "google",
    origins: [process.env.GOOGLE_WALLET_ALLOWED_ORIGINS!],
    typ: "savetowallet",
    payload: {
      genericClasses: [
        {
          id: classId,
          issuerName: "BadgeFlow",
          reviewStatus: "UNDER_REVIEW"
        }
      ],
      genericObjects: [
        {
          id: objectId,
          classId,
          cardTitle: { defaultValue: { language: "en-GB", value: card.full_name || "Staff" } },
          subheader: {
            defaultValue: {
              language: "en-GB",
              value: [card.role, card.department].filter(Boolean).join(" · ")
            }
          },
          barcode: { type: "QR_CODE", value: verifyUrl, alternateText: "Verify" },
          validTimeInterval: card.valid_until
            ? { start: { date: new Date().toISOString() }, end: { date: new Date(card.valid_until).toISOString() } }
            : undefined,
          linksModuleData: { uris: [{ uri: verifyUrl, description: "Verify ID" }] },
          state: "ACTIVE"
        }
      ]
    }
  };

  const token = jwt.sign(payload, sa.private_key, { algorithm: "RS256" });
  return { saveUrl: `https://pay.google.com/gp/v/save/${token}` };
}
