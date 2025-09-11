'use client';
// /components/IdCardPreview.tsx
import React from 'react';
import { ID_CARD_THEMES } from '../lib/idCardThemes';
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
  theme?: keyof typeof ID_CARD_THEMES;
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
  onThemeChange?: (k: keyof typeof ID_CARD_THEMES) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm">Theme:</label>
        <select
          className="border px-2 py-1 rounded"
          value={data.theme ?? 'blue'}
          onChange={(e) => onThemeChange?.(e.target.value as keyof typeof ID_CARD_THEMES)}
        >
          {Object.values(ID_CARD_THEMES).map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <IdCardFront data={data as any} />
        <IdCardBack data={data as any} />
      </div>
    </div>
  );
}
