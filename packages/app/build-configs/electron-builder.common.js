/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'com.pandamock.app',
  productName: 'PandaMock',
  extraMetadata: { name: 'mockoon' },
  directories: {
    output: 'packages',
    buildResources: 'build-res'
  },
  files: [
    'package.json',
    'dist/**/*',
    'node_modules',
    'build-res/icon.ico',
    'build-res/icon_512x512x32.png'
  ],
  protocols: [
    {
      name: 'PandaMock',
      schemes: ['mockoon'],
      role: 'Editor'
    }
  ]
};

module.exports = config;
