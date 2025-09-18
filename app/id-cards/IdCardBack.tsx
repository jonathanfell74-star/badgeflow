'use client';
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

// CR80 ratio
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
      // target visual width ~80% of card width
      const barWidth = 1.6; // thickness of each bar (px)
      const barHeight = 44;

      JsBarcode(barcodeRef.current, data.employeeId, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 10,
        margin: 0,
        width: barWidth,
        height: barHeight,
      });
    } catch {
      // ignore
    }
  }, [data.employeeId]);

  return (
    <div
      className={`relative rounded-[12px] overflow-hidden border shadow-xl ${className ?? ''}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#fff',
        borderColor: theme.border,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
      data-card-side="back"
    >
      {/* Header / footer accents */}
      <div className="absolute inset-x-0 top-0 h-8" style={{ background: theme.primary }} />
      <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: theme.secondary }} />

      {/* Content */}
      <div className="absolute inset-0 pt-8 pb-2 px-10">
        <div className="flex h-full flex-col gap-3">
          {/* Barcode area */}
          <div
            className="border rounded-md bg-white flex items-center justify-center p-2"
            style={{ borderColor: theme.border }}
          >
            <svg ref={barcodeRef} />
          </div>

          {/* Emergency info */}
          <div
            className="rounded-md border p-3 text-[12px] leading-5"
            style={{ borderColor: theme.border, background: theme.bg, color: theme.subtext }}
          >
            <div className="mb-1 text-[12px] font-semibold" style={{ color: theme.text }}>
              Emergency Information
            </div>
            <div>
              <span className="font-medium" style={{ color: theme.text }}>ICE Contact:</span>{' '}
              {data.emergencyContactName ?? '—'}
            </div>
            <div>
              <span className="font-medium" style={{ color: theme.text }}>ICE Phone:</span>{' '}
              {data.emergencyContactPhone ?? '—'}
            </div>
            <div>
              <span className="font-medium" style={{ color: theme.text }}>Blood Type:</span>{' '}
              {data.bloodType ?? '—'}
            </div>
            <div>
              <span className="font-medium" style={{ color: theme.text }}>Allergies:</span>{' '}
              {data.allergies ?? '—'}
            </div>
          </div>

          {/* Spacer + footer note */}
          <div className="flex-1" />
          <div className="text-center text-[10px] text-gray-500">
            If found, please return to {data.companyName ?? 'Company'} • ID #{data.employeeId}
          </div>
        </div>
      </div>
    </div>
  );
}
