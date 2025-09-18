'use client';
import React from 'react';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

// CR80: 85.6mm × 54mm -> ratio ≈ 1.585 (landscape)
const CARD_W = 336;                    // on-screen width
const CARD_H = Math.round(CARD_W / 1.585); // ≈ 212px

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
      className="relative rounded-[12px] overflow-hidden border shadow-xl"
      style={{
        width: CARD_W,
        height: CARD_H,
        background: theme.bg,
        borderColor: theme.border,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
      data-card-side="front"
    >
      {/* Header band */}
      <div className="absolute inset-x-0 top-0 h-8" style={{ background: theme.primary }} />
      {/* Footer accent */}
      <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: theme.secondary }} />

      {/* Content area */}
      <div className="absolute inset-0 pt-8 pb-2 px-10">
        <div className="h-full grid grid-cols-[92px_1fr] gap-12 items-center">
          {/* Photo box */}
          <div
            className="relative h-[120px] w-[92px] rounded-md border bg-white/70 overflow-hidden"
            style={{ borderColor: theme.border }}
          >
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.photoUrl}
                alt={data.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => ((e.currentTarget.style.display = 'none'))}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">
                Photo
              </div>
            )}
          </div>

          {/* Text block */}
          <div className="flex h-full flex-col">
            {/* Company row */}
            <div className="flex items-center gap-2 h-5">
              {data.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.companyLogoUrl}
                  alt={data.companyName ?? 'Company'}
                  className="h-5 object-contain"
                  onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />
              ) : (
                <span className="text-[11px] font-medium text-gray-500">
                  {data.companyName ?? 'Company'}
                </span>
              )}
            </div>

            {/* Name */}
            <div className="mt-1 text-[20px] font-semibold leading-6" style={{ color: theme.text }}>
              {data.name}
            </div>

            {/* Title / Dept */}
            <div className="mt-0.5 text-[12px] leading-5" style={{ color: theme.subtext }}>
              {data.title ?? 'Staff'}
              {data.department ? ` • ${data.department}` : ''}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ID chip */}
            <div>
              <span
                className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] leading-none"
                style={{ background: theme.secondary, borderColor: theme.border, color: theme.text }}
              >
                ID: {data.employeeId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
