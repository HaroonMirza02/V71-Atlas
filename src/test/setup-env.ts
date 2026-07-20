// Loaded by Jest (see jest.config.js setupFiles) before any test file runs.
// Provides the minimum environment variables the config schema requires so
// modules can be imported in tests without a real database, Redis instance,
// or production secrets. Never use these values outside the test suite.

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/atlas_test';
process.env.MONGODB_DB_NAME = 'atlas_test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_characters_long';
process.env.ENCRYPTION_SECRET = 'test_encryption_secret_32_chars_min';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FORMAT = 'json';
