// /lib/idCardThemes.ts
export type IdCardThemeKey = 'blue' | 'green' | 'red' | 'neutral';

export type IdCardTheme = {
  key: IdCardThemeKey;
  label: string;
  bg: string;
  primary: string;
  secondary: string;
  text: string;
  subtext: string;
  border: string;
};

export const ID_CARD_THEMES: Record<IdCardThemeKey, IdCardTheme> = {
  blue: {
    key: 'blue',
    label: 'Blue',
    bg: '#F5F8FF',
    primary: '#1F6FEB',
    secondary: '#D6E4FF',
    text: '#0B1220',
    subtext: '#475569',
    border: '#A4C2FF',
  },
  green: {
    key: 'green',
    label: 'Green',
    bg: '#F3FFF6',
    primary: '#00A676',
    secondary: '#C8F2E5',
    text: '#0B1220',
    subtext: '#475569',
    border: '#9BE5D1',
  },
  red: {
    key: 'red',
    label: 'Red',
    bg: '#FFF5F5',
    primary: '#D64545',
    secondary: '#FFD6D6',
    text: '#0B1220',
    subtext: '#475569',
    border: '#FFC0C0',
  },
  neutral: {
    key: 'neutral',
    label: 'Neutral',
    bg: '#F7F7F7',
    primary: '#111827',
    secondary: '#E5E7EB',
    text: '#0B1220',
    subtext: '#475569',
    border: '#D1D5DB',
  },
};

export const DEFAULT_THEME_KEY: IdCardThemeKey = 'blue';
