import { CARD_PRICING, WALLET_BASE_GBP } from "../../lib/pricing";

export default function PricingPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Pricing</h1>

      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Printed ID Cards (CR80)</h2>
          <table style={{ width: "100%" }}>
            <tbody>
              {CARD_PRICING.map((t, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0" }}>
                    {t.max ? `${t.min}-${t.max}` : `${t.min}+`} cards
                  </td>
                  <td style={{ padding: "8px 0", textAlign: "right" }}>
                    £{t.unitPriceGBP.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Mobile Wallet Pass add-on</h2>
          <p style={{ color: "#475569" }}>
            Optional add-on: base price £{WALLET_BASE_GBP.toFixed(2)} with the same percentage
            discounts as the card tier.
          </p>
          <p style={{ marginTop: 8, color: "#475569" }}>
            Orders confirmed before <strong>3pm</strong> ship <strong>same day</strong>. After 3pm, we ship <strong>next day</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
