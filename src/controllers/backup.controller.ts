import { Request, Response } from 'express';
import { createEncryptedBackup, restoreEncryptedBackup, getBackupsList } from '../services/backup';
import { logger, auditLog } from '../lib/logger';
import { buildAuditContext } from '../utils/audit-context';
import path from 'path';

export async function listBackups(req: Request, res: Response): Promise<void> {
    try {
        const list = getBackupsList();
        res.json({ data: list });
    } catch (err: any) {
        logger.error('Failed to list backups', { error: err.message });
        res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to read backups directory' } });
    }
}

export async function doBackup(req: Request, res: Response): Promise<void> {
    try {
        const backupResult = await createEncryptedBackup();

        auditLog({
            ...buildAuditContext(req),
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'EXPORT_BACKUP',
            resource: 'database',
            outcome: 'success',
            details: { filepath: backupResult.filepath, size: backupResult.size },
        });

        res.json({
            message: 'Encrypted database state backup completed successfully',
            data: {
                filename: path.basename(backupResult.filepath),
                sizeBytes: backupResult.size,
            },
        });
    } catch (err: any) {
        auditLog({
            ...buildAuditContext(req),
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'EXPORT_BACKUP',
            resource: 'database',
            outcome: 'failure',
            details: { error: err.message },
        });

        res.status(500).json({ error: { code: 'BACKUP_FAILED', message: err.message } });
    }
}

export async function doRestore(req: Request, res: Response): Promise<void> {
    const { filename } = req.body;

    if (!filename) {
        res.status(400).json({
            error: { code: 'INVALID_INPUT', message: 'Backup filename is required in body' },
        });
        return;
    }

    // Prevent directory traversal attacks
    const safeFilename = path.basename(filename);
    const TargetPath = path.resolve('backups', safeFilename);

    try {
        const result = await restoreEncryptedBackup(TargetPath);

        auditLog({
            ...buildAuditContext(req),
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'RESTORE_BACKUP',
            resource: 'database',
            outcome: 'success',
            details: { filename: safeFilename, restoredCollections: result.restoredCollections },
        });

        res.json({
            message: 'Encrypted backup successfully verified and restored onto the database state',
            data: {
                restoredCollections: result.restoredCollections,
            },
        });
    } catch (err: any) {
        auditLog({
            ...buildAuditContext(req),
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'RESTORE_BACKUP',
            resource: 'database',
            outcome: 'failure',
            details: { filename: safeFilename, error: err.message },
        });

        res.status(500).json({ error: { code: 'RESTORE_FAILED', message: err.message } });
    }
}
