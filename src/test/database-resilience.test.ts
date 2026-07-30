import request from 'supertest';
import app from '../app';
import * as databaseModule from '../lib/database';
import * as redisModule from '../lib/redis';

describe('Condition 5: Database Unavailable Resilience', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /status returns 503 degraded when MongoDB connection is disconnected', async () => {
        // Mock getDatabaseStatus to simulate DB offline / disconnected
        jest.spyOn(databaseModule, 'getDatabaseStatus').mockReturnValue('disconnected');
        jest.spyOn(redisModule, 'getRedisStatus').mockReturnValue('ready');

        const response = await request(app).get('/status');

        expect(response.status).toBe(503);
        expect(response.body).toMatchObject({
            status: 'degraded',
            services: {
                database: 'disconnected',
            },
        });
    });

    it('GET /status returns 200 ok when database is connected and redis is ready', async () => {
        jest.spyOn(databaseModule, 'getDatabaseStatus').mockReturnValue('connected');
        jest.spyOn(redisModule, 'getRedisStatus').mockReturnValue('ready');

        const response = await request(app).get('/status');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.services.database).toBe('connected');
        expect(response.body.services.redis).toBe('ready');
    });

    it('Global error handler captures unhandled database & system errors gracefully without crashing process', async () => {
        // Mock getDatabaseStatus to throw a real error to simulate unhandled database/system failure
        jest.spyOn(databaseModule, 'getDatabaseStatus').mockImplementation(() => {
            throw new Error('Database connection failed unexpectedly');
        });
        jest.spyOn(redisModule, 'getRedisStatus').mockReturnValue('ready');

        const response = await request(app).get('/status');

        expect(response.status).toBe(500);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('SERVER_ERROR');
        expect(response.body.error.message).toBe('Database connection failed unexpectedly');
    });
});
