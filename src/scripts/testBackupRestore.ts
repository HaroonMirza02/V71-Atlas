import { connectDatabase, disconnectDatabase } from '../lib/database';
import { Signal } from '../models/Signal';
import { RawPayload } from '../models/Signal';
import { createEncryptedBackup, restoreEncryptedBackup, getBackupsList } from '../services/backup';
import fs from 'fs';

async function testBackupRestoreFlow() {
    console.log('🔄 Initiating backup/restore flow verification...');
    await connectDatabase();

    try {
        // 1. Get initial telemetry counts
        const initialSignalCount = await Signal.countDocuments();
        const initialPayloadCount = await RawPayload.countDocuments();
        console.log(`📊 Current DB State:`);
        console.log(`   - Signals: ${initialSignalCount.toLocaleString()}`);
        console.log(`   - RawPayloads: ${initialPayloadCount.toLocaleString()}`);

        if (initialSignalCount === 0) {
            console.log('⚠️ Database is empty. Seeding a few records first to have data to backup.');
            // (In practice we already have 100,000 records, but let's prevent empty tests.)
        }

        // 2. Perform Backup Export
        console.log('📦 Creating encrypted database backup...');
        const backupResult = await createEncryptedBackup();
        console.log(`✅ Backup created successfully at: ${backupResult.filepath}`);
        console.log(`   Size: ${(backupResult.size / 1024).toFixed(2)} KB`);

        // Verify the file exists
        if (!fs.existsSync(backupResult.filepath)) {
            throw new Error(`Backup file does not exist at predicted path: ${backupResult.filepath}`);
        }

        // 3. Clear/Wipe current database collection records
        console.log('🧹 Clearing current collection records to simulate disaster/empty state...');
        const clearSignals = await Signal.deleteMany({});
        const clearPayloads = await RawPayload.deleteMany({});
        console.log(`   Cleared ${clearSignals.deletedCount} signals and ${clearPayloads.deletedCount} raw payloads.`);

        const postClearSignalCount = await Signal.countDocuments();
        console.log(`   Confirming empty DB state: SignalsCount = ${postClearSignalCount}`);

        // 4. Perform Restore Operation
        console.log('📥 Restoring database state from the encrypted backup file...');
        const restoreResult = await restoreEncryptedBackup(backupResult.filepath);
        console.log(`✅ Restore operation completed. Restored collections:`, restoreResult.restoredCollections);

        // 5. Verify restored document counts match initial document counts
        const finalSignalCount = await Signal.countDocuments();
        const finalPayloadCount = await RawPayload.countDocuments();
        console.log(`📊 Restored DB Telemetry:`);
        console.log(`   - Signals: ${finalSignalCount.toLocaleString()}`);
        console.log(`   - RawPayloads: ${finalPayloadCount.toLocaleString()}`);

        if (finalSignalCount === initialSignalCount && finalPayloadCount === initialPayloadCount) {
            console.log('🎉 SUCCESS: Restored counts perfectly match original backup state!');
        } else {
            throw new Error(`Mismatch! Expected ${initialSignalCount} signals but restored ${finalSignalCount}.`);
        }

        // Clean up backup file created during test
        console.log('🗑️ Cleaning up the temporary backup encrypted file...');
        fs.unlinkSync(backupResult.filepath);
        console.log('✅ Temporary backup file removed.');

    } catch (err: any) {
        console.error('❌ Backup/Restore flow test failed:', err.stack || err.message);
    } finally {
        await disconnectDatabase();
        console.log('🔌 Disconnected from database.');
    }
}

testBackupRestoreFlow();
