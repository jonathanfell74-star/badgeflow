'use client';
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  ID_CARD_THEMES,
  DEFAULT_THEME_KEY,
  type IdCardThemeKey,
} from '@/lib/idCardThemes';

// CR80 dimensions → 85.6mm × 54mm (landscape ratio ≈ 1.585:1)
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
        width: 2,
        height: 40,
      });
    } catch {
      // ignore
    }
  }, [data.employeeId]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-sm border ${className ?? ''}`}
      style={{ width: CARD_W, height: CARD_H, background: '#fff', borderColor: theme.border }}
      data-card-side="back"
    >
      {/* Top stripe */}
      <div style={{ background: theme.primary }} className="h-6 w-full" />

      <div className="p-3 h-[calc(100%-1.5rem)] flex flex-col gap-2">
        {/* Barcode */}
        <div
          className="border rounded-md p-2 flex items-center justify-center bg-white"
          style={{ borderColor: theme.border }}
        >
          <svg ref={barcodeRef} />
        </div>

        {/* Emergency info */}
        <div
          className="text-[11px] leading-5 border rounded-md p-2"
          style={{ borderColor: theme.border, background: theme.bg }}
        >
          <div className="font-semibold mb-1" style={{ color: theme.text }}>
            Emergency Information
          </div>
          <div style={{ color: theme.subtext }}>
            <div><span className="font-medium" style={{ color: theme.text }}>ICE Contact:</span> {data.emergencyContactName ?? '—'}</div>
            <div><span className="font-medium" style={{ color: theme.text }}>ICE Phone:</span> {data.emergencyContactPhone ?? '—'}</div>
            <div><span className="font-medium" style={{ color: theme.text }}>Blood Type:</span> {data.bloodType ?? '—'}</div>
            <div><span className="font-medium" style={{ color: theme.text }}>Allergies:</span> {data.allergies ?? '—'}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto text-[10px] text-center text-gray-500">
          If found, please return to {data.companyName ?? 'Company'} • ID #{data.employeeId}
        </div>
      </div>

      {/* Bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[6px]" style={{ background: theme.secondary }} />
    </div>
  );
}
