'use client';
import React from 'react';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

// CR80 dimensions → 85.6mm × 54mm (landscape ratio ≈ 1.585:1)
const CARD_W = 336; // preview width
const CARD_H = Math.round(CARD_W / 1.585); // keep ratio exact

type CardData = {
  employeeId: string;
  name: string;
  title?: string;
  department?: string;
  photoUrl?: string;
  companyName?: string;
  companyLogoUrl?: string;
  theme?: IdCardThemeKey;
};

export default function IdCardFront({ data }: { data: CardData }) {
  const themeKey: IdCardThemeKey = data.theme ?? DEFAULT_THEME_KEY;
  const theme = ID_CARD_THEMES[themeKey];

  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-sm border"
      style={{ width: CARD_W, height: CARD_H, background: theme.bg, borderColor: theme.border }}
      data-card-side="front"
    >
      {/* Top stripe */}
      <div style={{ background: theme.primary }} className="h-6 w-full" />

      <div className="p-3 flex gap-3 h-[calc(100%-1.5rem)]">
        {/* Photo box */}
        <div
          className="w-20 h-full bg-white/70 border rounded-md overflow-hidden flex items-center justify-center"
          style={{ borderColor: theme.border }}
        >
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-xs text-gray-500">No Photo</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            {data.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.companyLogoUrl} alt={data.companyName ?? 'Company'} className="h-5 object-contain" />
            ) : (
              <span className="text-[11px] font-medium text-gray-500">{data.companyName ?? 'Company'}</span>
            )}
          </div>
          <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
            {data.name}
          </div>
          <div className="text-[11px]" style={{ color: theme.subtext }}>
            {data.title ?? 'Staff'}{data.department ? ` • ${data.department}` : ''}
          </div>
          <div className="mt-auto">
            <div
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border"
              style={{ background: theme.secondary, borderColor: theme.border, color: theme.text }}
            >
              ID: {data.employeeId}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[6px]" style={{ background: theme.secondary }} />
    </div>
  );
}
