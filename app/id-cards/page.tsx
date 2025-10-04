'use client';
import React, { useState } from 'react';
import IdCardPreview from './IdCardPreview';
import { ID_CARD_THEMES, type IdCardThemeKey } from '@/lib/idCardThemes';

const SAMPLE = {
  employeeId: 'E1234',
  name: 'Alex Smith',
  title: 'Operations Manager',
  department: 'Ops',
  companyName: 'BadgeFlow',
  companyLogoUrl: '/logo-badgeflow.jpg',
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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>ID Card Preview</h1>
      <div style={{ background: '#fff' }}>
        <IdCardPreview data={card} onThemeChange={(k) => setCard((c) => ({ ...c, theme: k }))} />
      </div>
    </div>
  );
}
