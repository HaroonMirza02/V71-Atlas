import { Router } from 'express';
import { login, signup, profile } from '../controllers/auth.controller';
import { getSignals, getSignalById, reviewSignal } from '../controllers/signals.controller';
import { getConnectors, triggerConnector, updateConnectorState } from '../controllers/connectors.controller';
import { listBackups, doBackup, doRestore } from '../controllers/backup.controller';
import { getSystemMetrics } from '../controllers/metrics.controller';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validateBody, sanitizeInput } from '../middleware/validate';
import {
    loginSchema,
    signupSchema,
    reviewSchema,
    connectorStateSchema,
    restoreSchema,
} from '../utils/validation-schemas';

const router = Router();

// Apply sanitization globally for all query/body inputs
router.use(sanitizeInput);

// ── Auth Routes ───────────────────────────────────────────────
router.post('/auth/login', validateBody(loginSchema), login);
router.post('/auth/signup', validateBody(signupSchema), signup); // Dynamic signup includes auth bootstrapping
router.get('/auth/profile', authenticateToken, profile);

// ── Signals Routes ─────────────────────────────────────────────
router.get('/signals', authenticateToken, requirePermission('signals:read'), getSignals);
router.get('/signals/:id', authenticateToken, requirePermission('signals:read'), getSignalById);
router.put(
    '/signals/:id/review',
    authenticateToken,
    requirePermission('signals:review'),
    validateBody(reviewSchema),
    reviewSignal
);

// ── Connectors Routes ──────────────────────────────────────────
router.get('/connectors', authenticateToken, requirePermission('connectors:read'), getConnectors);
router.post(
    '/connectors/:id/trigger',
    authenticateToken,
    requirePermission('connectors:write'),
    triggerConnector
);
router.put(
    '/connectors/:id/state',
    authenticateToken,
    requirePermission('users:manage'), // ADMIN-only switch control limit
    validateBody(connectorStateSchema),
    updateConnectorState
);

// ── Backup Routes ──────────────────────────────────────────────
router.get('/backups', authenticateToken, requirePermission('backups:manage'), listBackups);
router.post('/backups/export', authenticateToken, requirePermission('backups:manage'), doBackup);
router.post(
    '/backups/restore',
    authenticateToken,
    requirePermission('backups:manage'),
    validateBody(restoreSchema),
    doRestore
);

// ── Metrics Routes ─────────────────────────────────────────────
router.get('/metrics', authenticateToken, requirePermission('metrics:read'), getSystemMetrics);

export default router;
