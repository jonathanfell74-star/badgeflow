export type Tier = { min: number; max?: number; unitPriceGBP: number };

export const CARD_PRICING: Tier[] = [
  { min: 1,  max: 9,  unitPriceGBP: 9.95 },
  { min: 10, max: 49, unitPriceGBP: 6.95 },
  { min: 50, max: 199, unitPriceGBP: 4.95 },
  { min: 200,              unitPriceGBP: 3.5 }
];

// Mobile wallet add-on is optional (+£4.95 base) with same percentage discount as cards.
export const WALLET_BASE_GBP = 4.95;

export function priceForQuantity(qty: number) {
  const tier =
    CARD_PRICING.find(t => qty >= t.min && (t.max ? qty <= t.max : true)) ??
    CARD_PRICING[CARD_PRICING.length - 1];

  const first = CARD_PRICING[0].unitPriceGBP;
  const discountPct = 1 - tier.unitPriceGBP / first;
  const walletUnit = +(WALLET_BASE_GBP * (1 - discountPct)).toFixed(2);

  return { cardUnit: tier.unitPriceGBP, walletUnit };
}
