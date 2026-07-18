import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from './logger';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
    if (isConnected) return;

    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected', { db: config.MONGODB_DB_NAME });
        isConnected = true;
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — will retry');
        isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
    });

    await mongoose.connect(config.MONGODB_URI, {
        dbName: config.MONGODB_DB_NAME,
        maxPoolSize: 20,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
    });
}

export async function disconnectDatabase(): Promise<void> {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
}

export function getDatabaseStatus(): 'connected' | 'disconnected' | 'connecting' {
    const state = mongoose.connection.readyState;
    if (state === 1) return 'connected';
    if (state === 2) return 'connecting';
    return 'disconnected';
}
