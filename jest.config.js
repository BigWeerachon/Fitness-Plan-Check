const expoPreset = require('jest-expo/jest-preset');

// เพิ่มแพ็กเกจ ESM ที่ต้องแปลงด้วย babel ต่อจากรายการมาตรฐานของ jest-expo
const EXTRA_ESM = [
  'react-native-.*',
  '@react-native-google-signin',
  'react-native-gifted-charts',
  'gifted-charts-core',
  '@revenuecat',
  'drizzle-orm',
];

module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    expoPreset.transformIgnorePatterns[0].replace(
      'standard-navigation',
      `standard-navigation|${EXTRA_ESM.join('|')}`,
    ),
    ...expoPreset.transformIgnorePatterns.slice(1),
  ],
};
