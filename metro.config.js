const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs');

// Fix: react-native-webview 13.x ships "react-native": "src/index.ts" which
// causes Metro on Windows to fail resolving "./WebViewShared" (a .tsx file
// inside node_modules TS source). Force Metro to use the compiled index.js instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-webview') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/react-native-webview/index.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
