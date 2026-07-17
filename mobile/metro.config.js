const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // @react-native-community/geolocation v3.x ships TypeScript source as its
    // "react-native" entry point, which Metro cannot resolve. Redirect to the
    // pre-compiled CommonJS output so Metro gets plain .js files.
    extraNodeModules: {
      '@react-native-community/geolocation': path.resolve(
        __dirname,
        'node_modules/@react-native-community/geolocation/lib/commonjs',
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
