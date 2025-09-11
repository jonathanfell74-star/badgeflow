'use client';
// /components/IdCardBack.tsx
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { ID_CARD_THEMES, DEFAULT_THEME_KEY } from '../lib/idCardThemes';

const CARD_W = 336; // on-screen preview width
const CARD_H = Math.round((2.125 / 3.37) * CARD_W); // CR80 aspect ratio

type CardData = {
  employeeId: string;
  companyName?: string;
  theme?: keyof typeof ID_CARD_THEMES;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
};

type Props = { data: CardData; className?: string };

export default function IdCardBack({ data, className }: Props) {
  const theme = ID_CARD_THEMES[data.theme ?? (DEFAULT_THEME_KEY as any)];
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
        height: 42,
      });
    } catch {
      // ignore
    }
  }, [data.employeeId]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-sm border ${className ?? ''}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#fff',
        borderColor: theme.border,
      }}
      data-card-side="back"
      data-employee-id={data.employeeId}
    >
      {/* Top strip */}
      <div style={{ background: theme.primary }} className="h-6 w-full" />

      <div className="p-3 h-[calc(100%-1.5rem)] flex flex-col gap-3">
        {/* Barcode */}
        <div
          className="border rounded-md p-2 flex items-center justify-center bg-white"
          style={{ borderColor: theme.border }}
        >
          <svg ref={barcodeRef} />
        </div>

        {/* Emergency info */}
        <div
          className="text-[11px] leading-5 border rounded-md p-3"
          style={{ borderColor: theme.border, background: theme.bg }}
        >
          <div className="font-semibold mb-1" style={{ color: theme.text }}>
            Emergency Information
          </div>
          <div style={{ color: theme.subtext }}>
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
        </div>

        {/* Footer */}
        <div className="mt-auto text-[10px] text-center text-gray-500">
          If found, please return to {data.companyName ?? 'Company'} • ID #{data.employeeId}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 h-[6px]" style={{ background: theme.secondary }} />
    </div>
  );
}
