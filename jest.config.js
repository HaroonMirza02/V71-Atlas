/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    setupFiles: ['<rootDir>/src/test/setup-env.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^uuid$': require.resolve('uuid'),
    },
    clearMocks: true,
    verbose: true,
};
