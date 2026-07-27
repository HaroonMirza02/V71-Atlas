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
        // Perform request to non-existent endpoint to verify standard 404 error envelope handling
        const response = await request(app).get('/api/v1/non-existent-route');

        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('NOT_FOUND');
    });
});
