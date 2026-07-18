import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './lib/logger';
import { uuid } from './utils/uuid';
import router from './routes';
import { getDatabaseStatus } from './lib/database';
import { getRedisStatus } from './lib/redis';

const app = express();

// ── Request ID & Trace Middleware ─────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
    const reqId = String(req.headers['x-request-id'] || uuid());
    req.requestId = reqId;
    next();
});

// ── Security & Utility Middlewares ────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' })); // Custom settings can adjust origins
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging Middleware ────────────────────────────────────────
// Standard developer formats and Morgan combined layouts
const logFormat = config.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
    morgan(logFormat, {
        stream: {
            write: (message: string) => logger.info(message.trim(), { service: 'http-server' }),
        },
    })
);

// ── Global Rate Limiting protection ───────────────────────────
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests originating from this IP address segment. Please wait before attempting further inquiries.',
        },
    },
});
app.use('/api/', limiter);

// ── Public Liveness and Readiness Endpoints ──────────────────
app.get('/status', (_req: Request, res: Response) => {
    const dbStatus = getDatabaseStatus();
    const redisStatus = getRedisStatus();

    const isHealthy = dbStatus === 'connected' && redisStatus === 'ready';

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus,
            redis: redisStatus,
        },
    });
});

// ── Versioned Core API Router Wiring ──────────────────────────
app.use(`/api/${config.API_VERSION}`, router);

// ── API Root Landing page ─────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
    res.json({
        message: 'Welcome to Vision71 Project Atlas Market Intelligence API Platform Web Service.',
        version: '1.0.0',
        documentation: '/api/v1/docs',
        status: '/status',
    });
});

// ── Resource Not Found handler (404) ──────────────────────────
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `The requested path resource cannot be located: [${req.method}] ${req.path}`,
        },
    });
});

// ── Global Security and System Error Handler (500) ────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const errorId = req.requestId || uuid();
    logger.error('Unhandled Server Error exception', {
        errorId,
        path: req.path,
        message: err.message,
        stack: err.stack,
    });

    // Handle express-rate-limit payload errors or validation exceptions
    const errStatus = err.status || 500;
    res.status(errStatus).json({
        error: {
            code: err.code || 'SERVER_ERROR',
            message: err.message || 'An internal operating system error occurred during server execution.',
            details: config.NODE_ENV === 'development' ? { stack: err.stack } : {},
            requestId: errorId,
        },
    });
});

export default app;
