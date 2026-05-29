export interface Country {
  flag: string;
  name: string;
  code: string;
  currency: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRIES: Country[] = [
  {flag: '🇬🇧', name: 'United Kingdom',   code: '+44',  currency: 'GBP', minDigits: 10, maxDigits: 10},
  {flag: '🇺🇸', name: 'United States',    code: '+1',   currency: 'USD', minDigits: 10, maxDigits: 10},
  {flag: '🇨🇦', name: 'Canada',           code: '+1',   currency: 'CAD', minDigits: 10, maxDigits: 10},
  {flag: '🇮🇳', name: 'India',            code: '+91',  currency: 'INR', minDigits: 10, maxDigits: 10},
  {flag: '🇵🇰', name: 'Pakistan',         code: '+92',  currency: 'PKR', minDigits: 10, maxDigits: 11},
  {flag: '🇧🇩', name: 'Bangladesh',       code: '+880', currency: 'BDT', minDigits: 10, maxDigits: 10},
  {flag: '🇳🇬', name: 'Nigeria',          code: '+234', currency: 'NGN', minDigits: 10, maxDigits: 10},
  {flag: '🇬🇭', name: 'Ghana',            code: '+233', currency: 'GHS', minDigits: 9,  maxDigits: 9 },
  {flag: '🇿🇦', name: 'South Africa',     code: '+27',  currency: 'ZAR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇵🇱', name: 'Poland',           code: '+48',  currency: 'PLN', minDigits: 9,  maxDigits: 9 },
  {flag: '🇷🇴', name: 'Romania',          code: '+40',  currency: 'RON', minDigits: 9,  maxDigits: 9 },
  {flag: '🇧🇬', name: 'Bulgaria',         code: '+359', currency: 'BGN', minDigits: 8,  maxDigits: 9 },
  {flag: '🇱🇹', name: 'Lithuania',        code: '+370', currency: 'EUR', minDigits: 8,  maxDigits: 8 },
  {flag: '🇱🇻', name: 'Latvia',           code: '+371', currency: 'EUR', minDigits: 8,  maxDigits: 8 },
  {flag: '🇪🇪', name: 'Estonia',          code: '+372', currency: 'EUR', minDigits: 7,  maxDigits: 8 },
  {flag: '🇩🇪', name: 'Germany',          code: '+49',  currency: 'EUR', minDigits: 10, maxDigits: 12},
  {flag: '🇫🇷', name: 'France',           code: '+33',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇮🇪', name: 'Ireland',          code: '+353', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇳🇱', name: 'Netherlands',      code: '+31',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇧🇪', name: 'Belgium',          code: '+32',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇪🇸', name: 'Spain',            code: '+34',  currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇮🇹', name: 'Italy',            code: '+39',  currency: 'EUR', minDigits: 9,  maxDigits: 10},
  {flag: '🇵🇹', name: 'Portugal',         code: '+351', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇨🇿', name: 'Czech Republic',   code: '+420', currency: 'CZK', minDigits: 9,  maxDigits: 9 },
  {flag: '🇸🇰', name: 'Slovakia',         code: '+421', currency: 'EUR', minDigits: 9,  maxDigits: 9 },
  {flag: '🇭🇺', name: 'Hungary',          code: '+36',  currency: 'HUF', minDigits: 8,  maxDigits: 9 },
  {flag: '🇺🇦', name: 'Ukraine',          code: '+380', currency: 'UAH', minDigits: 9,  maxDigits: 9 },
  {flag: '🇵🇭', name: 'Philippines',      code: '+63',  currency: 'PHP', minDigits: 10, maxDigits: 10},
  {flag: '🇦🇺', name: 'Australia',        code: '+61',  currency: 'AUD', minDigits: 9,  maxDigits: 9 },
  {flag: '🇳🇿', name: 'New Zealand',      code: '+64',  currency: 'NZD', minDigits: 8,  maxDigits: 9 },
  {flag: '🇸🇬', name: 'Singapore',        code: '+65',  currency: 'SGD', minDigits: 8,  maxDigits: 8 },
  {flag: '🇦🇪', name: 'UAE',              code: '+971', currency: 'AED', minDigits: 9,  maxDigits: 9 },
  {flag: '🇸🇦', name: 'Saudi Arabia',     code: '+966', currency: 'SAR', minDigits: 9,  maxDigits: 9 },
];
