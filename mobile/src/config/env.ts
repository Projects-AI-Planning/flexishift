import {Platform} from 'react-native';

const devHost =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_ORIGIN = (
  __DEV__ ? devHost : 'https://freightflex.indian-merchant-navy.com'
).replace(/\/+$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const WS_BASE_URL = API_ORIGIN.replace(/^http/, 'ws');

// Same key as AndroidManifest — not a secret (ships inside the APK)
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCQc692P9GZQcT4H2FGfrI2wIGcRG0kRa4';
