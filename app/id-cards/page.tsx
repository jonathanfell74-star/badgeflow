'use client';
// /app/id-cards/page.tsx
import React, { useState } from 'react';
import IdCardPreview from './IdCardPreview';
import { ID_CARD_THEMES, type IdCardThemeKey } from '@/lib/idCardThemes';

const SAMPLE = {
  employeeId: 'E1234',
  name: 'Alex Smith',
  title: 'Operations Manager',
  department: 'Ops',
  companyName: 'BadgeFlow',
  companyLogoUrl: '/logo-badgeflow.svg',
  photoUrl: '/sample/alex.jpg',
  emergencyContactName: 'Sam Smith',
  emergencyContactPhone: '+44 7700 900001',
  bloodType: 'O+',
  allergies: 'None',
  theme: 'blue' as IdCardThemeKey,
};

export default function Page() {
  const [card, setCard] = useState(SAMPLE);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">ID Card Preview</h1>
      <div className="bg-white border rounded-xl p-4">
        <IdCardPreview
          data={card}
          onThemeChange={(k) => setCard((c) => ({ ...c, theme: k }))}
        />
      </div>
    </div>
  );
}
