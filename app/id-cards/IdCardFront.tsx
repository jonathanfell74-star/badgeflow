'use client';
import React from 'react';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

// CR80 landscape ratio
const CARD_W = 336;
const CARD_H = Math.round(CARD_W / 1.585);

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

  const LOGO_HEIGHT = 36;
  const LOGO_MAX_W = 220;

  return (
    <div
      data-card-side="front"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        // softer, realistic drop shadow (no big rectangle behind)
        boxShadow:
          '0 18px 45px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.10)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      {/* header/footer accents */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, background: theme.primary }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: theme.secondary }} />

      {/* content */}
      <div style={{ position: 'absolute', inset: 0, padding: '32px 40px 8px 40px' }}>
        <div
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: 28,
            alignItems: 'center',
          }}
        >
          {/* photo */}
          <div
            style={{
              width: 100,
              height: 128,
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#6b7280',
            }}
          >
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.photoUrl}
                alt={data.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => ((e.currentTarget.style.display = 'none'))}
              />
            ) : (
              'Photo'
            )}
          </div>

          {/* info */}
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: LOGO_HEIGHT }}>
              {data.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.companyLogoUrl}
                  alt={data.companyName ?? 'Company'}
                  style={{ height: LOGO_HEIGHT, maxWidth: LOGO_MAX_W, objectFit: 'contain' }}
                  onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>
                  {data.companyName ?? 'Company'}
                </span>
              )}
            </div>

            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, lineHeight: '26px', color: theme.text }}>
              {data.name}
            </div>

            <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: '20px', color: theme.subtext }}>
              {data.title ?? 'Staff'}{data.department ? ` • ${data.department}` : ''}
            </div>

            <div style={{ flex: 1 }} />

            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 11,
                  lineHeight: 1,
                  background: theme.secondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
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
