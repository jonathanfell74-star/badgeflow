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
    <div style={{ display: 'grid', gap: 12 }}>
      {/* theme row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 14 }}>Theme:</label>
        <select
          value={currentTheme}
          onChange={(e) => onThemeChange?.(e.target.value as IdCardThemeKey)}
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px' }}
        >
          {Object.values(ID_CARD_THEMES).map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* preview surface */}
      <div
        style={{
          background: '#F9FAFB',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <IdCardFront data={data as any} />
          <IdCardBack data={data as any} />
        </div>
      </div>
    </div>
  );
}
