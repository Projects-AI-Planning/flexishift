import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type Coords = {latitude: number; longitude: number};

export class LocationError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

// code 1 = permission denied, 2 = position unavailable, 3 = timeout (matches GeolocationError)
const PERMISSION_DENIED = 1;

export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'FlexiShift needs your location to find nearby jobs and shifts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Ask Me Later',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function getPosition(options: object): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve({latitude: pos.coords.latitude, longitude: pos.coords.longitude}),
      err => reject(err),
      options,
    );
  });
}

/**
 * Reliably obtain the device's current location.
 * Requests permission, then tries a high-accuracy (GPS) fix first and falls back
 * to a faster network/coarse fix if GPS times out or is unavailable — this is what
 * makes it work indoors and on emulators where a pure GPS fix often never arrives.
 * Throws a LocationError (code 1 = permission denied) on failure.
 */
export async function getCurrentLocation(): Promise<Coords> {
  const allowed = await ensureLocationPermission();
  if (!allowed) {
    throw new LocationError('Location permission denied', PERMISSION_DENIED);
  }
  try {
    return await getPosition({enableHighAccuracy: true, timeout: 15000, maximumAge: 10000});
  } catch (err: any) {
    if (err?.code === PERMISSION_DENIED) {
      throw new LocationError('Location permission denied', PERMISSION_DENIED);
    }
    // GPS timed out / unavailable — fall back to coarse (network) location.
    return await getPosition({enableHighAccuracy: false, timeout: 30000, maximumAge: 60000});
  }
}

export function describeLocationError(err: any): string {
  if (err?.code === PERMISSION_DENIED) {
    return 'Location permission denied';
  }
  return 'Unable to get your location. Make sure GPS / location is turned on.';
}
