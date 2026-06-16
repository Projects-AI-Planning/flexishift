import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const COUNTRIES = [
  { flag: '🇦🇫', name: 'Afghanistan', iso: 'AF', code: '+93', currency: 'AFN' },
  { flag: '🇦🇱', name: 'Albania', iso: 'AL', code: '+355', currency: 'ALL' },
  { flag: '🇩🇿', name: 'Algeria', iso: 'DZ', code: '+213', currency: 'DZD' },
  { flag: '🇦🇩', name: 'Andorra', iso: 'AD', code: '+376', currency: 'EUR' },
  { flag: '🇦🇴', name: 'Angola', iso: 'AO', code: '+244', currency: 'AOA' },
  { flag: '🇦🇬', name: 'Antigua and Barbuda', iso: 'AG', code: '+1268', currency: 'XCD' },
  { flag: '🇦🇷', name: 'Argentina', iso: 'AR', code: '+54', currency: 'ARS' },
  { flag: '🇦🇲', name: 'Armenia', iso: 'AM', code: '+374', currency: 'AMD' },
  { flag: '🇦🇺', name: 'Australia', iso: 'AU', code: '+61', currency: 'AUD' },
  { flag: '🇦🇹', name: 'Austria', iso: 'AT', code: '+43', currency: 'EUR' },
  { flag: '🇦🇿', name: 'Azerbaijan', iso: 'AZ', code: '+994', currency: 'AZN' },
  { flag: '🇧🇸', name: 'Bahamas', iso: 'BS', code: '+1242', currency: 'BSD' },
  { flag: '🇧🇭', name: 'Bahrain', iso: 'BH', code: '+973', currency: 'BHD' },
  { flag: '🇧🇩', name: 'Bangladesh', iso: 'BD', code: '+880', currency: 'BDT' },
  { flag: '🇧🇧', name: 'Barbados', iso: 'BB', code: '+1246', currency: 'BBD' },
  { flag: '🇧🇾', name: 'Belarus', iso: 'BY', code: '+375', currency: 'BYN' },
  { flag: '🇧🇪', name: 'Belgium', iso: 'BE', code: '+32', currency: 'EUR' },
  { flag: '🇧🇿', name: 'Belize', iso: 'BZ', code: '+501', currency: 'BZD' },
  { flag: '🇧🇯', name: 'Benin', iso: 'BJ', code: '+229', currency: 'XOF' },
  { flag: '🇧🇹', name: 'Bhutan', iso: 'BT', code: '+975', currency: 'BTN' },
  { flag: '🇧🇴', name: 'Bolivia', iso: 'BO', code: '+591', currency: 'BOB' },
  { flag: '🇧🇦', name: 'Bosnia and Herzegovina', iso: 'BA', code: '+387', currency: 'BAM' },
  { flag: '🇧🇼', name: 'Botswana', iso: 'BW', code: '+267', currency: 'BWP' },
  { flag: '🇧🇷', name: 'Brazil', iso: 'BR', code: '+55', currency: 'BRL' },
  { flag: '🇧🇳', name: 'Brunei', iso: 'BN', code: '+673', currency: 'BND' },
  { flag: '🇧🇬', name: 'Bulgaria', iso: 'BG', code: '+359', currency: 'BGN' },
  { flag: '🇧🇫', name: 'Burkina Faso', iso: 'BF', code: '+226', currency: 'XOF' },
  { flag: '🇧🇮', name: 'Burundi', iso: 'BI', code: '+257', currency: 'BIF' },
  { flag: '🇰🇭', name: 'Cambodia', iso: 'KH', code: '+855', currency: 'KHR' },
  { flag: '🇨🇲', name: 'Cameroon', iso: 'CM', code: '+237', currency: 'XAF' },
  { flag: '🇨🇦', name: 'Canada', iso: 'CA', code: '+1', currency: 'CAD' },
  { flag: '🇨🇻', name: 'Cape Verde', iso: 'CV', code: '+238', currency: 'CVE' },
  { flag: '🇨🇫', name: 'Central African Republic', iso: 'CF', code: '+236', currency: 'XAF' },
  { flag: '🇹🇩', name: 'Chad', iso: 'TD', code: '+235', currency: 'XAF' },
  { flag: '🇨🇱', name: 'Chile', iso: 'CL', code: '+56', currency: 'CLP' },
  { flag: '🇨🇳', name: 'China', iso: 'CN', code: '+86', currency: 'CNY' },
  { flag: '🇨🇴', name: 'Colombia', iso: 'CO', code: '+57', currency: 'COP' },
  { flag: '🇰🇲', name: 'Comoros', iso: 'KM', code: '+269', currency: 'KMF' },
  { flag: '🇨🇬', name: 'Congo', iso: 'CG', code: '+242', currency: 'XAF' },
  { flag: '🇨🇩', name: 'Congo (DRC)', iso: 'CD', code: '+243', currency: 'CDF' },
  { flag: '🇨🇷', name: 'Costa Rica', iso: 'CR', code: '+506', currency: 'CRC' },
  { flag: '🇨🇮', name: "Cote d'Ivoire", iso: 'CI', code: '+225', currency: 'XOF' },
  { flag: '🇭🇷', name: 'Croatia', iso: 'HR', code: '+385', currency: 'EUR' },
  { flag: '🇨🇺', name: 'Cuba', iso: 'CU', code: '+53', currency: 'CUP' },
  { flag: '🇨🇾', name: 'Cyprus', iso: 'CY', code: '+357', currency: 'EUR' },
  { flag: '🇨🇿', name: 'Czech Republic', iso: 'CZ', code: '+420', currency: 'CZK' },
  { flag: '🇩🇰', name: 'Denmark', iso: 'DK', code: '+45', currency: 'DKK' },
  { flag: '🇩🇯', name: 'Djibouti', iso: 'DJ', code: '+253', currency: 'DJF' },
  { flag: '🇩🇲', name: 'Dominica', iso: 'DM', code: '+1767', currency: 'XCD' },
  { flag: '🇩🇴', name: 'Dominican Republic', iso: 'DO', code: '+1809', currency: 'DOP' },
  { flag: '🇪🇨', name: 'Ecuador', iso: 'EC', code: '+593', currency: 'USD' },
  { flag: '🇪🇬', name: 'Egypt', iso: 'EG', code: '+20', currency: 'EGP' },
  { flag: '🇸🇻', name: 'El Salvador', iso: 'SV', code: '+503', currency: 'USD' },
  { flag: '🇬🇶', name: 'Equatorial Guinea', iso: 'GQ', code: '+240', currency: 'XAF' },
  { flag: '🇪🇷', name: 'Eritrea', iso: 'ER', code: '+291', currency: 'ERN' },
  { flag: '🇪🇪', name: 'Estonia', iso: 'EE', code: '+372', currency: 'EUR' },
  { flag: '🇸🇿', name: 'Eswatini', iso: 'SZ', code: '+268', currency: 'SZL' },
  { flag: '🇪🇹', name: 'Ethiopia', iso: 'ET', code: '+251', currency: 'ETB' },
  { flag: '🇫🇯', name: 'Fiji', iso: 'FJ', code: '+679', currency: 'FJD' },
  { flag: '🇫🇮', name: 'Finland', iso: 'FI', code: '+358', currency: 'EUR' },
  { flag: '🇫🇷', name: 'France', iso: 'FR', code: '+33', currency: 'EUR' },
  { flag: '🇬🇦', name: 'Gabon', iso: 'GA', code: '+241', currency: 'XAF' },
  { flag: '🇬🇲', name: 'Gambia', iso: 'GM', code: '+220', currency: 'GMD' },
  { flag: '🇬🇪', name: 'Georgia', iso: 'GE', code: '+995', currency: 'GEL' },
  { flag: '🇩🇪', name: 'Germany', iso: 'DE', code: '+49', currency: 'EUR' },
  { flag: '🇬🇭', name: 'Ghana', iso: 'GH', code: '+233', currency: 'GHS' },
  { flag: '🇬🇷', name: 'Greece', iso: 'GR', code: '+30', currency: 'EUR' },
  { flag: '🇬🇩', name: 'Grenada', iso: 'GD', code: '+1473', currency: 'XCD' },
  { flag: '🇬🇹', name: 'Guatemala', iso: 'GT', code: '+502', currency: 'GTQ' },
  { flag: '🇬🇳', name: 'Guinea', iso: 'GN', code: '+224', currency: 'GNF' },
  { flag: '🇬🇼', name: 'Guinea-Bissau', iso: 'GW', code: '+245', currency: 'XOF' },
  { flag: '🇬🇾', name: 'Guyana', iso: 'GY', code: '+592', currency: 'GYD' },
  { flag: '🇭🇹', name: 'Haiti', iso: 'HT', code: '+509', currency: 'HTG' },
  { flag: '🇭🇳', name: 'Honduras', iso: 'HN', code: '+504', currency: 'HNL' },
  { flag: '🇭🇰', name: 'Hong Kong', iso: 'HK', code: '+852', currency: 'HKD' },
  { flag: '🇭🇺', name: 'Hungary', iso: 'HU', code: '+36', currency: 'HUF' },
  { flag: '🇮🇸', name: 'Iceland', iso: 'IS', code: '+354', currency: 'ISK' },
  { flag: '🇮🇳', name: 'India', iso: 'IN', code: '+91', currency: 'INR' },
  { flag: '🇮🇩', name: 'Indonesia', iso: 'ID', code: '+62', currency: 'IDR' },
  { flag: '🇮🇷', name: 'Iran', iso: 'IR', code: '+98', currency: 'IRR' },
  { flag: '🇮🇶', name: 'Iraq', iso: 'IQ', code: '+964', currency: 'IQD' },
  { flag: '🇮🇪', name: 'Ireland', iso: 'IE', code: '+353', currency: 'EUR' },
  { flag: '🇮🇱', name: 'Israel', iso: 'IL', code: '+972', currency: 'ILS' },
  { flag: '🇮🇹', name: 'Italy', iso: 'IT', code: '+39', currency: 'EUR' },
  { flag: '🇯🇲', name: 'Jamaica', iso: 'JM', code: '+1876', currency: 'JMD' },
  { flag: '🇯🇵', name: 'Japan', iso: 'JP', code: '+81', currency: 'JPY' },
  { flag: '🇯🇴', name: 'Jordan', iso: 'JO', code: '+962', currency: 'JOD' },
  { flag: '🇰🇿', name: 'Kazakhstan', iso: 'KZ', code: '+7', currency: 'KZT' },
  { flag: '🇰🇪', name: 'Kenya', iso: 'KE', code: '+254', currency: 'KES' },
  { flag: '🇰🇮', name: 'Kiribati', iso: 'KI', code: '+686', currency: 'AUD' },
  { flag: '🇰🇼', name: 'Kuwait', iso: 'KW', code: '+965', currency: 'KWD' },
  { flag: '🇰🇬', name: 'Kyrgyzstan', iso: 'KG', code: '+996', currency: 'KGS' },
  { flag: '🇱🇦', name: 'Laos', iso: 'LA', code: '+856', currency: 'LAK' },
  { flag: '🇱🇻', name: 'Latvia', iso: 'LV', code: '+371', currency: 'EUR' },
  { flag: '🇱🇧', name: 'Lebanon', iso: 'LB', code: '+961', currency: 'LBP' },
  { flag: '🇱🇸', name: 'Lesotho', iso: 'LS', code: '+266', currency: 'LSL' },
  { flag: '🇱🇷', name: 'Liberia', iso: 'LR', code: '+231', currency: 'LRD' },
  { flag: '🇱🇾', name: 'Libya', iso: 'LY', code: '+218', currency: 'LYD' },
  { flag: '🇱🇮', name: 'Liechtenstein', iso: 'LI', code: '+423', currency: 'CHF' },
  { flag: '🇱🇹', name: 'Lithuania', iso: 'LT', code: '+370', currency: 'EUR' },
  { flag: '🇱🇺', name: 'Luxembourg', iso: 'LU', code: '+352', currency: 'EUR' },
  { flag: '🇲🇴', name: 'Macau', iso: 'MO', code: '+853', currency: 'MOP' },
  { flag: '🇲🇬', name: 'Madagascar', iso: 'MG', code: '+261', currency: 'MGA' },
  { flag: '🇲🇼', name: 'Malawi', iso: 'MW', code: '+265', currency: 'MWK' },
  { flag: '🇲🇾', name: 'Malaysia', iso: 'MY', code: '+60', currency: 'MYR' },
  { flag: '🇲🇻', name: 'Maldives', iso: 'MV', code: '+960', currency: 'MVR' },
  { flag: '🇲🇱', name: 'Mali', iso: 'ML', code: '+223', currency: 'XOF' },
  { flag: '🇲🇹', name: 'Malta', iso: 'MT', code: '+356', currency: 'EUR' },
  { flag: '🇲🇭', name: 'Marshall Islands', iso: 'MH', code: '+692', currency: 'USD' },
  { flag: '🇲🇷', name: 'Mauritania', iso: 'MR', code: '+222', currency: 'MRU' },
  { flag: '🇲🇺', name: 'Mauritius', iso: 'MU', code: '+230', currency: 'MUR' },
  { flag: '🇲🇽', name: 'Mexico', iso: 'MX', code: '+52', currency: 'MXN' },
  { flag: '🇫🇲', name: 'Micronesia', iso: 'FM', code: '+691', currency: 'USD' },
  { flag: '🇲🇩', name: 'Moldova', iso: 'MD', code: '+373', currency: 'MDL' },
  { flag: '🇲🇨', name: 'Monaco', iso: 'MC', code: '+377', currency: 'EUR' },
  { flag: '🇲🇳', name: 'Mongolia', iso: 'MN', code: '+976', currency: 'MNT' },
  { flag: '🇲🇪', name: 'Montenegro', iso: 'ME', code: '+382', currency: 'EUR' },
  { flag: '🇲🇦', name: 'Morocco', iso: 'MA', code: '+212', currency: 'MAD' },
  { flag: '🇲🇿', name: 'Mozambique', iso: 'MZ', code: '+258', currency: 'MZN' },
  { flag: '🇲🇲', name: 'Myanmar', iso: 'MM', code: '+95', currency: 'MMK' },
  { flag: '🇳🇦', name: 'Namibia', iso: 'NA', code: '+264', currency: 'NAD' },
  { flag: '🇳🇷', name: 'Nauru', iso: 'NR', code: '+674', currency: 'AUD' },
  { flag: '🇳🇵', name: 'Nepal', iso: 'NP', code: '+977', currency: 'NPR' },
  { flag: '🇳🇱', name: 'Netherlands', iso: 'NL', code: '+31', currency: 'EUR' },
  { flag: '🇳🇿', name: 'New Zealand', iso: 'NZ', code: '+64', currency: 'NZD' },
  { flag: '🇳🇮', name: 'Nicaragua', iso: 'NI', code: '+505', currency: 'NIO' },
  { flag: '🇳🇪', name: 'Niger', iso: 'NE', code: '+227', currency: 'XOF' },
  { flag: '🇳🇬', name: 'Nigeria', iso: 'NG', code: '+234', currency: 'NGN' },
  { flag: '🇰🇵', name: 'North Korea', iso: 'KP', code: '+850', currency: 'KPW' },
  { flag: '🇲🇰', name: 'North Macedonia', iso: 'MK', code: '+389', currency: 'MKD' },
  { flag: '🇳🇴', name: 'Norway', iso: 'NO', code: '+47', currency: 'NOK' },
  { flag: '🇴🇲', name: 'Oman', iso: 'OM', code: '+968', currency: 'OMR' },
  { flag: '🇵🇰', name: 'Pakistan', iso: 'PK', code: '+92', currency: 'PKR' },
  { flag: '🇵🇼', name: 'Palau', iso: 'PW', code: '+680', currency: 'USD' },
  { flag: '🇵🇸', name: 'Palestine', iso: 'PS', code: '+970', currency: 'ILS' },
  { flag: '🇵🇦', name: 'Panama', iso: 'PA', code: '+507', currency: 'PAB' },
  { flag: '🇵🇬', name: 'Papua New Guinea', iso: 'PG', code: '+675', currency: 'PGK' },
  { flag: '🇵🇾', name: 'Paraguay', iso: 'PY', code: '+595', currency: 'PYG' },
  { flag: '🇵🇪', name: 'Peru', iso: 'PE', code: '+51', currency: 'PEN' },
  { flag: '🇵🇭', name: 'Philippines', iso: 'PH', code: '+63', currency: 'PHP' },
  { flag: '🇵🇱', name: 'Poland', iso: 'PL', code: '+48', currency: 'PLN' },
  { flag: '🇵🇹', name: 'Portugal', iso: 'PT', code: '+351', currency: 'EUR' },
  { flag: '🇶🇦', name: 'Qatar', iso: 'QA', code: '+974', currency: 'QAR' },
  { flag: '🇷🇴', name: 'Romania', iso: 'RO', code: '+40', currency: 'RON' },
  { flag: '🇷🇺', name: 'Russia', iso: 'RU', code: '+7', currency: 'RUB' },
  { flag: '🇷🇼', name: 'Rwanda', iso: 'RW', code: '+250', currency: 'RWF' },
  { flag: '🇰🇳', name: 'Saint Kitts and Nevis', iso: 'KN', code: '+1869', currency: 'XCD' },
  { flag: '🇱🇨', name: 'Saint Lucia', iso: 'LC', code: '+1758', currency: 'XCD' },
  { flag: '🇻🇨', name: 'Saint Vincent and the Grenadines', iso: 'VC', code: '+1784', currency: 'XCD' },
  { flag: '🇼🇸', name: 'Samoa', iso: 'WS', code: '+685', currency: 'WST' },
  { flag: '🇸🇲', name: 'San Marino', iso: 'SM', code: '+378', currency: 'EUR' },
  { flag: '🇸🇹', name: 'Sao Tome and Principe', iso: 'ST', code: '+239', currency: 'STN' },
  { flag: '🇸🇦', name: 'Saudi Arabia', iso: 'SA', code: '+966', currency: 'SAR' },
  { flag: '🇸🇳', name: 'Senegal', iso: 'SN', code: '+221', currency: 'XOF' },
  { flag: '🇷🇸', name: 'Serbia', iso: 'RS', code: '+381', currency: 'RSD' },
  { flag: '🇸🇨', name: 'Seychelles', iso: 'SC', code: '+248', currency: 'SCR' },
  { flag: '🇸🇱', name: 'Sierra Leone', iso: 'SL', code: '+232', currency: 'SLL' },
  { flag: '🇸🇬', name: 'Singapore', iso: 'SG', code: '+65', currency: 'SGD' },
  { flag: '🇸🇰', name: 'Slovakia', iso: 'SK', code: '+421', currency: 'EUR' },
  { flag: '🇸🇮', name: 'Slovenia', iso: 'SI', code: '+386', currency: 'EUR' },
  { flag: '🇸🇧', name: 'Solomon Islands', iso: 'SB', code: '+677', currency: 'SBD' },
  { flag: '🇸🇴', name: 'Somalia', iso: 'SO', code: '+252', currency: 'SOS' },
  { flag: '🇿🇦', name: 'South Africa', iso: 'ZA', code: '+27', currency: 'ZAR' },
  { flag: '🇰🇷', name: 'South Korea', iso: 'KR', code: '+82', currency: 'KRW' },
  { flag: '🇸🇸', name: 'South Sudan', iso: 'SS', code: '+211', currency: 'SSP' },
  { flag: '🇪🇸', name: 'Spain', iso: 'ES', code: '+34', currency: 'EUR' },
  { flag: '🇱🇰', name: 'Sri Lanka', iso: 'LK', code: '+94', currency: 'LKR' },
  { flag: '🇸🇩', name: 'Sudan', iso: 'SD', code: '+249', currency: 'SDG' },
  { flag: '🇸🇷', name: 'Suriname', iso: 'SR', code: '+597', currency: 'SRD' },
  { flag: '🇸🇪', name: 'Sweden', iso: 'SE', code: '+46', currency: 'SEK' },
  { flag: '🇨🇭', name: 'Switzerland', iso: 'CH', code: '+41', currency: 'CHF' },
  { flag: '🇸🇾', name: 'Syria', iso: 'SY', code: '+963', currency: 'SYP' },
  { flag: '🇹🇼', name: 'Taiwan', iso: 'TW', code: '+886', currency: 'TWD' },
  { flag: '🇹🇯', name: 'Tajikistan', iso: 'TJ', code: '+992', currency: 'TJS' },
  { flag: '🇹🇿', name: 'Tanzania', iso: 'TZ', code: '+255', currency: 'TZS' },
  { flag: '🇹🇭', name: 'Thailand', iso: 'TH', code: '+66', currency: 'THB' },
  { flag: '🇹🇱', name: 'Timor-Leste', iso: 'TL', code: '+670', currency: 'USD' },
  { flag: '🇹🇬', name: 'Togo', iso: 'TG', code: '+228', currency: 'XOF' },
  { flag: '🇹🇴', name: 'Tonga', iso: 'TO', code: '+676', currency: 'TOP' },
  { flag: '🇹🇹', name: 'Trinidad and Tobago', iso: 'TT', code: '+1868', currency: 'TTD' },
  { flag: '🇹🇳', name: 'Tunisia', iso: 'TN', code: '+216', currency: 'TND' },
  { flag: '🇹🇷', name: 'Turkey', iso: 'TR', code: '+90', currency: 'TRY' },
  { flag: '🇹🇲', name: 'Turkmenistan', iso: 'TM', code: '+993', currency: 'TMT' },
  { flag: '🇹🇻', name: 'Tuvalu', iso: 'TV', code: '+688', currency: 'AUD' },
  { flag: '🇺🇬', name: 'Uganda', iso: 'UG', code: '+256', currency: 'UGX' },
  { flag: '🇺🇦', name: 'Ukraine', iso: 'UA', code: '+380', currency: 'UAH' },
  { flag: '🇦🇪', name: 'United Arab Emirates', iso: 'AE', code: '+971', currency: 'AED' },
  { flag: '🇬🇧', name: 'United Kingdom', iso: 'GB', code: '+44', currency: 'GBP' },
  { flag: '🇺🇸', name: 'United States', iso: 'US', code: '+1', currency: 'USD' },
  { flag: '🇺🇾', name: 'Uruguay', iso: 'UY', code: '+598', currency: 'UYU' },
  { flag: '🇺🇿', name: 'Uzbekistan', iso: 'UZ', code: '+998', currency: 'UZS' },
  { flag: '🇻🇺', name: 'Vanuatu', iso: 'VU', code: '+678', currency: 'VUV' },
  { flag: '🇻🇦', name: 'Vatican City', iso: 'VA', code: '+379', currency: 'EUR' },
  { flag: '🇻🇪', name: 'Venezuela', iso: 'VE', code: '+58', currency: 'VES' },
  { flag: '🇻🇳', name: 'Vietnam', iso: 'VN', code: '+84', currency: 'VND' },
  { flag: '🇾🇪', name: 'Yemen', iso: 'YE', code: '+967', currency: 'YER' },
  { flag: '🇿🇲', name: 'Zambia', iso: 'ZM', code: '+260', currency: 'ZMW' },
  { flag: '🇿🇼', name: 'Zimbabwe', iso: 'ZW', code: '+263', currency: 'ZWL' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', companyName: '', address: '',
    password: '', confirmPassword: '',
    vatNumber: '', organisationNumber: '',
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // E-Signature state
  const esigCanvasRef = useRef<HTMLCanvasElement>(null);
  const esigDrawing = useRef(false);
  const esigLastPoint = useRef<{ x: number; y: number } | null>(null);
  const esigPathLen = useRef(0);
  const [esigHasStrokes, setEsigHasStrokes] = useState(false);
  const [orgDocFile, setOrgDocFile] = useState<File | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRIES.find(c => c.name === e.target.value) ?? COUNTRIES[0];
    setSelectedCountry(found);
  };

  // ── E-Signature helpers ────────────────────────────────────────────────
  const esigGetPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = esigCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  // A real signature must have some actual pen travel — a plain click/tap (no
  // movement) must NOT count. We accumulate the drawn path length and only mark
  // the signature valid once it exceeds this threshold.
  const ESIG_MIN_PATH = 40; // px of total stroke travel

  const esigStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    esigDrawing.current = true;
    esigLastPoint.current = esigGetPos(e);
  };

  const esigDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!esigDrawing.current || !esigCanvasRef.current) return;
    const ctx = esigCanvasRef.current.getContext('2d')!;
    const pos = esigGetPos(e);
    const last = esigLastPoint.current!;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    esigPathLen.current += Math.hypot(pos.x - last.x, pos.y - last.y);
    if (!esigHasStrokes && esigPathLen.current >= ESIG_MIN_PATH) {
      setEsigHasStrokes(true);
    }
    esigLastPoint.current = pos;
  };

  const esigEndDraw = () => {
    esigDrawing.current = false;
    esigLastPoint.current = null;
  };

  const esigClear = () => {
    const canvas = esigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    esigPathLen.current = 0;
    setEsigHasStrokes(false);
  };

  const getRegistrationError = (err: unknown) => {
    if (!axios.isAxiosError(err)) return 'Registration failed. Please try again.';
    const data = err.response?.data;
    const fieldErrors = data?.data?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0)
      return fieldErrors.map((i: { message?: string }) => i?.message).filter(Boolean).join('. ');
    return data?.message || data?.detail || 'Registration failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneDigits = localPhone.replace(/\D/g, '');
    if (phoneDigits.length < 6 || phoneDigits.length > 12) {
      setError('Enter a valid local phone number (6–12 digits after the country code).');
      return;
    }
    if (!form.companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    if (!form.organisationNumber.trim()) {
      setError('Organisation Number is required.');
      return;
    }
    if (!esigHasStrokes) {
      setError('Please draw your e-signature before registering.');
      return;
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter.'); return; }
    if (!/\d/.test(form.password)) { setError('Password must contain a digit.'); return; }

    const esignatureData = esigCanvasRef.current!.toDataURL('image/png');

    setIsSubmitting(true);
    try {
      // Optional: upload the organisation registration document first, then pass its URL.
      let organisationDocUrl: string | undefined;
      if (orgDocFile) {
        try {
          const fd = new FormData();
          fd.append('file', orgDocFile);
          const res = await haulierService.uploadOrganisationDocument(fd);
          organisationDocUrl = res?.fileUrl;
        } catch {
          setError('Failed to upload the organisation document. Please try again or remove it.');
          setIsSubmitting(false);
          return;
        }
      }
      await haulierService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${selectedCountry.code}${phoneDigits}`,
        country: selectedCountry.iso,
        currency: selectedCountry.currency,
        companyName: form.companyName.trim() || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
        role: 'HAULIER',
        organisationNumber: form.organisationNumber.trim(),
        vatNumber: form.vatNumber.trim() || undefined,
        esignatureData,
        organisationDocUrl,
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (err) {
      setError(getRegistrationError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full py-10">
      <div className="bg-white p-5 sm:p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-lg">

        <div className="flex flex-col items-center mb-8">
          <div className="bg-navy p-3 rounded-full mb-4">
            <Truck className="text-[#1066b1]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">Create Haulier Account</h1>
          <p className="text-gray-500 text-sm mt-1">FreightFlex Logistics Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name + Company */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={set('name')} className={inputCls} placeholder="John Smith" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Company Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Smith Haulage Ltd" required />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Email Address <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="john@smithhaulage.com" required />
          </div>

          {/* Country selector */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Country</label>
            <select value={selectedCountry.name} onChange={handleCountryChange} className={inputCls}>
              {COUNTRIES.map(c => (
                <option key={c.name} value={c.name}>{c.flag}  {c.name}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Phone Number <span className="text-red-500">*</span></label>
            <div className="flex rounded-lg border border-gray-200 focus-within:border-[#1066b1] focus-within:ring-2 focus-within:ring-[#1066b1]/20 transition-all overflow-hidden">
              <div className="bg-gray-50 border-r border-gray-200 px-3 py-3 text-sm font-semibold text-navy shrink-0 flex items-center gap-1.5">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.code}</span>
              </div>
              <input
                type="tel"
                value={localPhone}
                onChange={e => setLocalPhone(e.target.value.replace(/[^\d\s\-]/g, ''))}
                className="flex-1 px-4 py-3 outline-none text-sm"
                placeholder="Local number"
                required
              />
            </div>
            {localPhone.replace(/\D/g, '').length > 0 && (
              <p className="text-xs text-[#1066b1] font-semibold mt-1 ml-1">
                Full: {selectedCountry.code}{localPhone.replace(/\D/g, '')}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Address <span className="text-red-500">*</span></label>
            <input type="text" value={form.address} onChange={set('address')} className={inputCls} placeholder="123 Logistics Park, Manchester" required />
          </div>

          {/* Organisation Number + VAT Number */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Organisation Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.organisationNumber}
                onChange={set('organisationNumber')}
                className={inputCls}
                placeholder="e.g. 12345678"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Company registration / org number</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                VAT Number
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={set('vatNumber')}
                className={inputCls}
                placeholder="e.g. GB123456789"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank if not VAT registered</p>
            </div>
          </div>

          {/* Organisation Registration Document (optional) */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">
              Organisation Registration Document
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            {orgDocFile ? (
              <div className="flex items-center justify-between rounded-lg border border-[#1066b1]/30 bg-[#1066b1]/5 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-navy truncate">
                  <span className="material-symbols-outlined text-[18px] text-[#1066b1]">description</span>
                  <span className="truncate">{orgDocFile.name}</span>
                </span>
                <button type="button" onClick={() => setOrgDocFile(null)} className="ml-3 shrink-0 text-xs font-bold text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-[#1066b1] hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-gray-400">upload_file</span>
                Upload your organisation registration document
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setOrgDocFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <p className="text-xs text-gray-400 mt-1">PDF or image. Optional — if added, it will be sent to admin for verification.</p>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  className={`${inputCls} pr-11`} placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')}
                  className={`${inputCls} pr-11`} placeholder="Repeat password" required />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* E-Signature — mandatory */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              E-Signature <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Draw your signature below. This will be used for handover sign-offs and can be updated later in your profile.
            </p>

            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 focus-within:border-[#1066b1]">
              <canvas
                ref={esigCanvasRef}
                width={480}
                height={140}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={esigStartDraw}
                onMouseMove={esigDraw}
                onMouseUp={esigEndDraw}
                onMouseLeave={esigEndDraw}
                onTouchStart={esigStartDraw}
                onTouchMove={esigDraw}
                onTouchEnd={esigEndDraw}
              />
              {!esigHasStrokes && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300 select-none">
                  Draw your signature here
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              {esigHasStrokes ? (
                <span className="text-xs font-semibold text-emerald-600">✓ Signature drawn</span>
              ) : (
                <span className="text-xs text-red-400">Signature required</span>
              )}
              <button
                type="button"
                onClick={esigClear}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terms notice */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            By creating an account you agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1066b1] hover:underline">
              Terms &amp; Conditions
            </Link>.
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md disabled:opacity-60">
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-navy hover:underline">Sign In</Link>
          </p>
          <p className="text-sm text-gray-500">
            Registered but not verified?{' '}
            <Link to="/verify-email" className="font-semibold text-navy hover:underline">Verify Email</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
