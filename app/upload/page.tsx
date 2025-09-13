'use client';
// /app/upload/page.tsx
import React, { useState } from 'react';
import IdCardPreview from '@/app/id-cards/IdCardPreview';
import { type IdCardThemeKey } from '@/lib/idCardThemes';

// Example roster rows (replace this with your real Supabase data later)
const SAMPLE_ROSTER = [
  {
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
  },
  {
    employeeId: 'E5678',
    name: 'Jen Nguyen',
    title: 'Designer',
    department: 'Creative',
    companyName: 'BadgeFlow',
    companyLogoUrl: '/logo-badgeflow.svg',
    photoUrl: '/sample/jen.jpg',
    emergencyContactName: 'Chris Nguyen',
    emergencyContactPhone: '+44 7700 900002',
    bloodType: 'A+',
    allergies: 'Peanuts',
    theme: 'green' as IdCardThemeKey,
  },
];

export default function UploadPage() {
  const [theme, setTheme] = useState<IdCardThemeKey>('blue');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Upload & Preview</h1>

      <p className="text-sm text-gray-600">
        This page shows how uploaded roster rows appear with the new CR80 card preview.
      </p>

      <div className="space-y-6">
        {SAMPLE_ROSTER.map((person) => (
          <div key={person.employeeId} className="bg-white border rounded-xl p-4">
            <IdCardPreview
              data={{ ...person, theme }}
              onThemeChange={(k) => setTheme(k)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
