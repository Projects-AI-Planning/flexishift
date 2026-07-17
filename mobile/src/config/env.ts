// ── API environments ────────────────────────────────────────────────────────
// Pick which backend a DEBUG build talks to by changing API_ENV below.
// Release builds always use `prod` regardless of this setting.
type ApiEnv = 'local' | 'dev' | 'prod';
const API_ENV: ApiEnv = 'local';

// 10.0.2.2 = host machine's localhost as seen from the Android emulator.
// On a physical device use `adb reverse tcp:8000 tcp:8000` so localhost maps to your PC,
// or set LOCAL to your machine's LAN IP (e.g. http://192.168.1.50:8000).
const isEmulator = false; // set false when running local backend on a physical device
const LOCAL = isEmulator ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

// Deployed dev/staging API.
const DEV = 'https://api.flexishift.io';

// Production API.
const PROD = 'https://api.flexishift.io';

const ORIGINS: Record<ApiEnv, string> = {local: LOCAL, dev: DEV, prod: PROD};

export const API_ORIGIN = (__DEV__ ? ORIGINS[API_ENV] : PROD).replace(/\/+$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const WS_BASE_URL = API_ORIGIN.replace(/^https/, 'ws').replace(/^http/, 'ws');

// Same key as AndroidManifest — not a secret (ships inside the APK)
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAL89oi-v795KLD1l3lDYGhK6R7X77ZvTs';
