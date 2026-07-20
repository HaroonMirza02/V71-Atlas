import { connectDatabase, disconnectDatabase } from '../lib/database';
import { registry } from '../connectors';
import { ConnectorState } from '../models/ConnectorState';

async function testConnectors() {
    console.log('🔌 Verification of Connectors & Outbound Network Ingest...');
    await connectDatabase();

    try {
        // Sync states to DB
        console.log('🔄 Syncing connector states to DB...');
        await registry.syncStatesToDB();

        // 1. Health Checks
        console.log('🏥 Running Health Checks on all registered connectors...');
        const healths = await registry.healthCheckAll();
        console.log('📋 Health check results:');
        for (const h of healths) {
            console.log(`   - [${h.connectorId}]: status = ${h.status.toUpperCase()}, latency = ${h.latencyMs}ms ${h.error ? `(Error: ${h.error})` : ''}`);
        }

        // 2. Fetch Test for Real Active Connectors
        const activeIds = ['github', 'rss', 'remotive', 'hackernews'];
        console.log('\n📥 Attempting to fetch a real batch from active connectors...');

        for (const sourceId of activeIds) {
            console.log(`\n☁️  Testing ${sourceId.toUpperCase()} connector fetchBatch()...`);
            const connector = registry.get(sourceId);

            try {
                const startTime = Date.now();
                const result = await connector.fetchBatch();
                const duration = Date.now() - startTime;

                console.log(`   ✅ Success! Completed in ${duration}ms`);
                console.log(`      - Records fetched: ${result.records.length}`);
                console.log(`      - Has more pages: ${result.hasMore}`);
                console.log(`      - Next cursor: ${result.nextCursor}`);

                if (result.records.length > 0) {
                    const sample = result.records[0];
                    console.log(`      - Sample record title: "${sample.title}"`);
                    console.log(`      - Sample canonical URL: ${sample.url}`);
                    console.log(`      - Category inferred: ${sample.category}`);
                    console.log(`      - Tags detected: [${sample.tags.slice(0, 5).join(', ')}]`);
                } else {
                    console.log('      ⚠️ Warning: No records returned for query.');
                }
            } catch (err: any) {
                console.error(`   ❌ Failed fetching for ${sourceId}:`, err.message);
            }
        }

    } catch (err: any) {
        console.error('❌ Connector verification test failed:', err.stack || err.message);
    } finally {
        await disconnectDatabase();
        console.log('\n🔌 Disconnected from database.');
    }
}

testConnectors();
