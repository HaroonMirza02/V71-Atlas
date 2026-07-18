import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { logger } from '../lib/logger';
import { config } from '../config';

// Ensure backup folder exists
const BACKUP_DIR = path.resolve('backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const ALGORITHM = 'aes-256-cbc';

/** Encrypt backup buffer using AES-256-CBC */
function encryptBackup(data: string): Buffer {
    const key = crypto.createHash('sha256').update(config.ENCRYPTION_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        iv,
        cipher.update(data, 'utf8'),
        cipher.final(),
    ]);
    return encrypted;
}

/** Decrypt backup buffer using AES-256-CBC */
function decryptBackup(encryptedBuffer: Buffer): string {
    const key = crypto.createHash('sha256').update(config.ENCRYPTION_SECRET).digest();
    const iv = encryptedBuffer.slice(0, 16);
    const ciphertext = encryptedBuffer.slice(16);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

/** Execute backup process */
export async function createEncryptedBackup(): Promise<{ filepath: string; size: number }> {
    try {
        logger.info('Database backup initiated...');
        const collections = mongoose.connection.collections;
        const backupData: Record<string, any[]> = {};

        for (const name of Object.keys(collections)) {
            const docs = await mongoose.connection.collection(name).find({}).toArray();
            backupData[name] = docs;
        }

        const payload = JSON.stringify(backupData);
        const encrypted = encryptBackup(payload);

        const filename = `backup-${Date.now().toString()}.enc`;
        const filepath = path.join(BACKUP_DIR, filename);

        fs.writeFileSync(filepath, encrypted);
        logger.info('Decrypted database backup created successfully', { filepath, size: encrypted.length });

        return {
            filepath,
            size: encrypted.length,
        };
    } catch (err: any) {
        logger.error('Database backup execution failed', { error: err.message });
        throw err;
    }
}

/** Restore database from backup file */
export async function restoreEncryptedBackup(filepath: string): Promise<{ restoredCollections: string[] }> {
    try {
        logger.info('Database restore initiated from file', { filepath });
        if (!fs.existsSync(filepath)) {
            throw new Error(`Backup file not found at: ${filepath}`);
        }

        const encrypted = fs.readFileSync(filepath);
        const decryptedPayload = decryptBackup(encrypted);
        const backupData = JSON.parse(decryptedPayload) as Record<string, any[]>;

        const restoredCollections: string[] = [];

        for (const name of Object.keys(backupData)) {
            const documents = backupData[name];
            if (!Array.isArray(documents)) continue;

            logger.info(`Restoring collection details`, { collection: name, count: documents.length });

            // Clear existing records
            await mongoose.connection.collection(name).deleteMany({});

            if (documents.length > 0) {
                // Restore documents (insulating objectIDs properly from string versions)
                const parsedDocs = documents.map((doc) => {
                    if (doc._id) {
                        doc._id = new mongoose.Types.ObjectId(doc._id);
                    }
                    // Convert date strings back to Date objects where applicable
                    for (const key of Object.keys(doc)) {
                        if (typeof doc[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(doc[key])) {
                            const d = new Date(doc[key]);
                            if (!isNaN(d.getTime())) {
                                doc[key] = d;
                            }
                        }
                    }
                    return doc;
                });

                await mongoose.connection.collection(name).insertMany(parsedDocs);
            }

            restoredCollections.push(name);
        }

        logger.info('Database restore completed successfully', { restoredCollections });
        return { restoredCollections };
    } catch (err: any) {
        logger.error('Database restore execution failed', { error: err.message });
        throw err;
    }
}

/** Get list of all available backups */
export function getBackupsList() {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.enc'))
        .map((f) => {
            const stat = fs.statSync(path.join(BACKUP_DIR, f));
            return {
                filename: f,
                filepath: path.join(BACKUP_DIR, f),
                createdAt: stat.birthtime,
                sizeBytes: stat.size,
            };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
