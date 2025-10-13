// components/WalletButtons.tsx
"use client";
import { useState } from "react";

export default function WalletButtons({
  cardId,
  appleUrl,
  googleUrl,
}: {
  cardId: string;
  appleUrl?: string | null;
  googleUrl?: string | null;
}) {
  const [gUrl, setGUrl] = useState<string | null>(googleUrl ?? null);
  const [loading, setLoading] = useState(false);

  const createGoogle = async () => {
    setLoading(true);
    const res = await fetch("/api/wallet/google/jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId })
    });
    setLoading(false);
    const data = await res.json();
    if (data?.url) setGUrl(data.url);
  };

  const createApple = async () => {
    const res = await fetch("/api/wallet/apple/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "badgeflow.pkpass";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={createApple}
        className="rounded-2xl px-4 py-3 shadow bg-black text-white disabled:opacity-50"
        disabled={!cardId}
        title="Add to Apple Wallet"
      >
         Add to Apple Wallet
      </button>

      {gUrl ? (
        <a
          href={gUrl}
          className="rounded-2xl px-4 py-3 shadow bg-white text-black border"
          title="Add to Google Wallet"
        >
          Add to Google Wallet
        </a>
      ) : (
        <button
          onClick={createGoogle}
          className="rounded-2xl px-4 py-3 shadow bg-white text-black border disabled:opacity-50"
          disabled={loading}
          title="Generate Google Wallet Link"
        >
          {loading ? "Generating…" : "Generate Google Wallet Link"}
        </button>
      )}
    </div>
  );
}
