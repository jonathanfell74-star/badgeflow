'use client';
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

const CARD_W = 336;
const CARD_H = Math.round(CARD_W / 1.585);

type CardData = {
  employeeId: string;
  companyName?: string;
  theme?: IdCardThemeKey;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
};

type Props = { data: CardData; className?: string };

export default function IdCardBack({ data, className }: Props) {
  const themeKey: IdCardThemeKey = data.theme ?? DEFAULT_THEME_KEY;
  const theme = ID_CARD_THEMES[themeKey];

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || !data.employeeId) return;
    try {
      JsBarcode(barcodeRef.current, data.employeeId, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 10,
        margin: 0,
        width: 1.6,
        height: 44,
      });
    } catch {
      // ignore
    }
  }, [data.employeeId]);

  return (
    <div
      data-card-side="back"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        background: '#fff',
        border: `1px solid ${theme.border}`,
        boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      {/* header/footer accents */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, background: theme.primary }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: theme.secondary }} />

      {/* content */}
      <div style={{ position: 'absolute', inset: 0, padding: '32px 40px 8px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
          {/* barcode box */}
          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
            }}
          >
            <svg ref={barcodeRef} />
          </div>

          {/* emergency info */}
          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              background: theme.bg,
              padding: 10,
              fontSize: 12,
              lineHeight: '20px',
              color: theme.subtext,
            }}
          >
            <div style={{ marginBottom: 4, fontWeight: 600, color: theme.text }}>Emergency Information</div>
            <div><span style={{ fontWeight: 600, color: theme.text }}>ICE Contact:</span> {data.emergencyContactName ?? '—'}</div>
            <div><span style={{ fontWeight: 600, color: theme.text }}>ICE Phone:</span> {data.emergencyContactPhone ?? '—'}</div>
            <div><span style={{ fontWeight: 600, color: theme.text }}>Blood Type:</span> {data.bloodType ?? '—'}</div>
            <div><span style={{ fontWeight: 600, color: theme.text }}>Allergies:</span> {data.allergies ?? '—'}</div>
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
            If found, please return to {data.companyName ?? 'Company'} • ID #{data.employeeId}
          </div>
        </div>
      </div>
    </div>
  );
}
