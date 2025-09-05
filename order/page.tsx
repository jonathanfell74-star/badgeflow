export default function OrderPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Start an order</h1>
      <p style={{ color: "#475569", marginBottom: 12 }}>
        Upload your company logo and staff rota (CSV/Excel) at checkout. Mobile wallet passes
        are optional and follow the same % discount as cards.
      </p>
      <p style={{ color: "#64748b" }}>
        Orders confirmed before <strong>3pm</strong> ship <strong>same day</strong>. After 3pm → <strong>next day</strong>.
      </p>
      <p style={{ marginTop: 12 }}>
        <em>Checkout and file upload will be enabled in the next step (Stripe + Supabase).</em>
      </p>
    </div>
  );
}
