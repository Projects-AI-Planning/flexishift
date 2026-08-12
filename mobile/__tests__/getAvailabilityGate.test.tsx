import {it, expect, describe, jest} from '@jest/globals';

// Setup all native mocks required to import DriverApp
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getSystemVersion: () => '14',
  getUniqueIdSync: () => 'device-123',
  getModel: () => 'Pixel 6',
  getBrand: () => 'Google',
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Polyline: View,
  };
});

jest.mock('react-native-maps-directions', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('@react-native-community/datetimepicker', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Import the function to test
import {getAvailabilityGate} from '../src/DriverApp';

describe('getAvailabilityGate', () => {
  const mockProfileForm = {
    licenceNumber: 'DL12345',
    vehicleType: 'TRUCK',
    vehicleRegistration: 'AB12CDE',
  };

  it('should return wait_approval for a new driver whose documents are pending approval', () => {
    const documents = [
      {status: 'PENDING', documentType: 'DRIVING_LICENCE', fileUrl: 'http://example.com/dl.pdf', id: '1', customName: 'Licence'},
    ];
    
    // isAdminApproved is false or undefined
    const gateInfo = getAvailabilityGate(
      'DRIVER_ONLY',
      mockProfileForm,
      documents,
      'signature-data',
      false,
    );

    expect(gateInfo.nextAction).toBe('wait_approval');
  });

  it('should return wait_reupload_approval for an approved driver who re-uploaded a document (so status is pending)', () => {
    const documents = [
      {status: 'PENDING', documentType: 'DRIVING_LICENCE', fileUrl: 'http://example.com/dl.pdf', id: '1', customName: 'Licence'},
    ];
    
    // isAdminApproved is true
    const gateInfo = getAvailabilityGate(
      'DRIVER_ONLY',
      mockProfileForm,
      documents,
      'signature-data',
      true,
    );

    expect(gateInfo.nextAction).toBe('wait_reupload_approval');
  });
});
