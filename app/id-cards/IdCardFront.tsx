'use client';
// /app/id-cards/IdCardFront.tsx
import React from 'react';
import { ID_CARD_THEMES, DEFAULT_THEME_KEY } from '@/lib/idCardThemes';

const CARD_W = 336;
const CARD_H = Math.round((2.125 / 3.37) * CARD_W);

type CardData = {
  employeeId: string;
  name: string;
  title?: string;
  department?: string;
  photoUrl?: string;
  companyName?: string;
  companyLogoUrl?: string;
  theme?: keyof typeof ID_CARD_THEMES;
};

export default function IdCardFront({ data }: { data: CardData }) {
  const theme = ID_CARD_THEMES[data.theme ?? (DEFAULT_THEME_KEY as any)];
  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-sm border"
      style={{ width: CARD_W, height: CARD_H, background: theme.bg, borderColor: theme.border }}
      data-card-side="front"
      data-employee-id={data.employeeId}
    >
      <div style={{ background: theme.primary }} className="h-8 w-full" />
      <div className="p-3 flex gap-3">
        <div
          className="w-20 h-24 bg-white/70 border rounded-md overflow-hidden flex items-center justify-center"
          style={{ borderColor: theme.border }}
        >
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-xs text-gray-500">No Photo</div>
          )}
        </div>
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
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: theme.secondary }} />
    </div>
  );
}
