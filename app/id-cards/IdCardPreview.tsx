'use client';
import React from 'react';
import { ID_CARD_THEMES, type IdCardThemeKey } from '@/lib/idCardThemes';
import IdCardFront from './IdCardFront';
import IdCardBack from './IdCardBack';

type CardData = {
  employeeId: string;
  name: string;
  title?: string;
  department?: string;
  photoUrl?: string;
  companyName?: string;
  companyLogoUrl?: string;
  theme?: IdCardThemeKey;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
};

export default function IdCardPreview({
  data,
  onThemeChange,
}: {
  data: CardData;
  onThemeChange?: (k: IdCardThemeKey) => void;
}) {
  const currentTheme: IdCardThemeKey = data.theme ?? 'blue';

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Theme control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 16 }}>Theme:</label>
        <select
          value={currentTheme}
          onChange={(e) => onThemeChange?.(e.target.value as IdCardThemeKey)}
          style={{
            border: '1px solid #D1D5DB',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 16,
          }}
        >
          {Object.values(ID_CARD_THEMES).map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cards: side-by-side, no background panel */}
      <div
        style={{
          display: 'flex',
          gap: 26,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <IdCardFront data={data as any} />
        <IdCardBack data={data as any} />
      </div>
    </div>
  );
}
