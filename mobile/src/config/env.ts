// Set this to a remote URL to use a deployed dev server instead of local.
// Leave empty ('') to use localhost (works for both emulator and device via adb reverse).
const DEV_API_URL = 'http://192.168.31.79:8000';

const localHost = 'http://localhost:8000';

const devHost = DEV_API_URL || localHost;

export const API_ORIGIN = (
  __DEV__ ? devHost : 'https://freightflex.indian-merchant-navy.com'
).replace(/\/+$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const WS_BASE_URL = API_ORIGIN.replace(/^http/, 'ws');

// Same key as AndroidManifest — not a secret (ships inside the APK)
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCq6Gq02pkjgkB5KjcEnKKSgcTWeZr8mvA';
