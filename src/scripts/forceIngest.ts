import { connectDatabase, disconnectDatabase } from '../lib/database';
import { addIngestJob } from '../queues/ingest.queue';

async function forceIngest() {
    console.log('🚀 Forcing immediate ingestion from all active connectors...');
    await connectDatabase();

    const activeIds = ['github', 'rss', 'remotive', 'hackernews', 'producthunt'];

    try {
        for (const sourceId of activeIds) {
            console.log(`📥 Queuing immediate fetch for: ${sourceId}`);
            await addIngestJob(sourceId, 'MANUAL', 'force-ingest-script');
        }
        console.log('✅ All ingestion jobs have been successfully added to the Redis Queue!');
        console.log('⏳ The background workers will process them momentarily. Check your dashboard in 1 minute!');
    } catch (err: any) {
        console.error('❌ Failed to trigger ingestion:', err.message);
    } finally {
        await disconnectDatabase();
        process.exit(0);
    }
}

forceIngest();

forceIngest();
