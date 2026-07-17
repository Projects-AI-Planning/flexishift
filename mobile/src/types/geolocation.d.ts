// Type shim for @react-native-community/geolocation (populated after npm install)
declare module '@react-native-community/geolocation' {
  interface GeolocationCoordinates {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  }

  interface GeolocationPosition {
    coords: GeolocationCoordinates;
    timestamp: number;
  }

  interface GeolocationError {
    code: number;
    message: string;
  }

  interface GeolocationOptions {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
    distanceFilter?: number;
    interval?: number;
    fastestInterval?: number;
  }

  const Geolocation: {
    watchPosition(
      success: (position: GeolocationPosition) => void,
      error?: (error: GeolocationError) => void,
      options?: GeolocationOptions,
    ): number;
    clearWatch(watchId: number): void;
    getCurrentPosition(
      success: (position: GeolocationPosition) => void,
      error?: (error: GeolocationError) => void,
      options?: GeolocationOptions,
    ): void;
    setRNConfiguration(config: Record<string, unknown>): void;
  };

  export default Geolocation;
}
