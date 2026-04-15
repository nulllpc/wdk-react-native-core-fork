module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: {
          ignoreCodes: [151002], // Ignore "Could not find a declaration file" warnings
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@tetherto/wdk-react-native-secure-storage$': '<rootDir>/tests/__mocks__/secureStorage.ts',
    '^react$': '<rootDir>/tests/__mocks__/react.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Ignore React Native modules if not available
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  // Allow tests to run without all dependencies
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-mmkv|react-native-bare-kit|@tetherto/pear-wrk-wdk)/)',
  ],
};

