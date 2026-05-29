export interface Country {
  flag: string;
  name: string;
  iso: string;   // 2-letter ISO 3166-1 alpha-2 code stored in the database
  code: string;  // dial code e.g. +44
  currency: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRIES: Country[] = [
  {flag: '🇬🇧', name: 'United Kingdom',   iso: 'GB', code: '+44',  currency: 'GBP', minDigits: 10, maxDigits: 10},
  {flag: '🇺🇸', name: 'United States',    iso: 'US', code: '+1',   currency: 'USD', minDigits: 10, maxDigits: 10},
  {flag: '🇨🇦', name: 'Canada',           iso: 'CA', code: '+1',   currency: 'CAD', minDigits: 10, maxDigits: 10},
  {flag: '🇮🇳', name: 'India',            iso: 'IN', code: '+91',  currency: 'INR', minDigits: 10, maxDigits: 10},
  {flag: '🇵🇰', name: 'Pakistan',         iso: 'PK', code: '+92',  currency: 'PKR', minDigits: 10, maxDigits: 11},
  {flag: '🇧🇩', name: 'Bangladesh',       iso: 'BD', code: '+880', currency: 'BDT', minDigits: 10, maxDigits: 10},
  {flag: '🇳🇬', name: 'Nigeria',          iso: 'NG', code: '+234', currency: 'NGN', minDigits: 10, maxDigits: 10},
  {flag: '🇬🇭', name: 'Ghana',            iso: 'GH', code: '+233', currency: 'GHS', minDigits: 9,  maxDigits: 9 },
  {flag: '🇿🇦', name: 'South Africa',     iso: 'ZA', code: '+27',  currency: 'ZAR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇵🇱', name: 'Poland',           iso: 'PL', code: '+48',  currency: 'PLN', minDigits: 9,  maxDigits: 9 },
  {flag: '🇷🇴', name: 'Romania',          iso: 'RO', code: '+40',  currency: 'RON', minDigits: 9,  maxDigits: 9 },
  {flag: '🇧🇬', name: 'Bulgaria',         iso: 'BG', code: '+359', currency: 'BGN', minDigits: 8,  maxDigits: 9 },
  {flag: '🇱🇹', name: 'Lithuania',        iso: 'LT', code: '+370', currency: 'EUR', minDigits: 8,  maxDigits: 8 },
  {flag: '🇱🇻', name: 'Latvia',           iso: 'LV', code: '+371', currency: 'EUR', minDigits: 8,  maxDigits: 8 },
  {flag: '🇪🇪', name: 'Estonia',          iso: 'EE', code: '+372', currency: 'EUR', minDigits: 7,  maxDigits: 8 },
  {flag: '🇩🇪', name: 'Germany',          iso: 'DE', code: '+49',  currency: 'EUR', minDigits: 10, maxDigits: 12},
  {flag: '🇫🇷', name: 'France',           iso: 'FR', code: '+33',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇮🇪', name: 'Ireland',          iso: 'IE', code: '+353', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇳🇱', name: 'Netherlands',      iso: 'NL', code: '+31',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇧🇪', name: 'Belgium',          iso: 'BE', code: '+32',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇪🇸', name: 'Spain',            iso: 'ES', code: '+34',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇮🇹', name: 'Italy',            iso: 'IT', code: '+39',  currency: 'EUR', minDigits: 9,  maxDigits: 10},
  {flag: '🇵🇹', name: 'Portugal',         iso: 'PT', code: '+351', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇨🇿', name: 'Czech Republic',   iso: 'CZ', code: '+420', currency: 'CZK', minDigits: 9,  maxDigits: 9 },
  {flag: '🇸🇰', name: 'Slovakia',         iso: 'SK', code: '+421', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇭🇺', name: 'Hungary',          iso: 'HU', code: '+36',  currency: 'HUF', minDigits: 8,  maxDigits: 9 },
  {flag: '🇺🇦', name: 'Ukraine',          iso: 'UA', code: '+380', currency: 'UAH', minDigits: 9,  maxDigits: 9 },
  {flag: '🇵🇭', name: 'Philippines',      iso: 'PH', code: '+63',  currency: 'PHP', minDigits: 10, maxDigits: 10},
  {flag: '🇦🇺', name: 'Australia',        iso: 'AU', code: '+61',  currency: 'AUD', minDigits: 9,  maxDigits: 9 },
  {flag: '🇳🇿', name: 'New Zealand',      iso: 'NZ', code: '+64',  currency: 'NZD', minDigits: 8,  maxDigits: 9 },
  {flag: '🇸🇬', name: 'Singapore',        iso: 'SG', code: '+65',  currency: 'SGD', minDigits: 8,  maxDigits: 8 },
  {flag: '🇦🇪', name: 'UAE',              iso: 'AE', code: '+971', currency: 'AED', minDigits: 9,  maxDigits: 9 },
  {flag: '🇸🇦', name: 'Saudi Arabia',     iso: 'SA', code: '+966', currency: 'SAR', minDigits: 9,  maxDigits: 9 },
];
