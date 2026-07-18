import { connectDatabase, disconnectDatabase } from '../lib/database';
import { Signal } from '../models/Signal';

async function runBenchmark() {
    console.log('\n🔍 Initiating Project Atlas Performance & Index Benchmark Query Analysis...');
    await connectDatabase();

    try {
        const totalSignals = await Signal.countDocuments();
        console.log(`📊 DB Telemetry: Total Canonical Signals present = ${totalSignals.toLocaleString()} records`);

        if (totalSignals === 0) {
            console.log('⚠️ Warning: Database is empty. Please run seeding script first: `npm run seed`');
            await disconnectDatabase();
            return;
        }

        // ─────────────────────────────────────────────────────────
        // Query 1: Filter on Indexed Category & Status + Sort Discovered Date (Standard Dashboard read)
        // ─────────────────────────────────────────────────────────
        console.log('\n⚡ Test 1: Category & Status Index Seek (Standard Dashboard query)');
        const q1Start = Date.now();
        const q1Result = await Signal.find({ category: 'TECHNOLOGY_TREND', status: 'PENDING' })
            .sort({ discoveredAt: -1 })
            .limit(20)
            .exec();
        const q1Latency = Date.now() - q1Start;
        console.log(`   - Latency: ${q1Latency} ms`);
        console.log(`   - Records returned: ${q1Result.length}`);

        const q1Explain = await (Signal.find({ category: 'TECHNOLOGY_TREND', status: 'PENDING' })
            .sort({ discoveredAt: -1 })
            .limit(20)
            .explain('executionStats') as any);

        const winningStage = q1Explain.queryPlanner?.winningPlan?.inputStage?.stage || q1Explain.queryPlanner?.winningPlan?.stage;
        const totalDocsExamined = q1Explain.executionStats?.totalDocsExamined ?? 0;
        const executionStages = JSON.stringify(q1Explain.queryPlanner?.winningPlan || {});

        console.log(`   - Optimized stage: ${winningStage}`);
        console.log(`   - Index verification: ${executionStages.includes('IXSCAN') ? '✅ IXSCAN (Index hit)' : '❌ COLLSCAN (Slow Table Sweep!)'}`);
        console.log(`   - Document read sweep count: ${totalDocsExamined}`);

        // ─────────────────────────────────────────────────────────
        // Query 2: Full-Text Search on Title/Description keywords
        // ─────────────────────────────────────────────────────────
        console.log('\n⚡ Test 2: Full-text Search Index matching (FTS query)');
        const q2Start = Date.now();
        const q2Result = await Signal.find(
            { $text: { $search: 'market opportunities' } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(10)
            .exec();
        const q2Latency = Date.now() - q2Start;
        console.log(`   - Latency: ${q2Latency} ms`);
        console.log(`   - Records returned: ${q2Result.length}`);

        const q2Explain = await (Signal.find(
            { $text: { $search: 'market opportunities' } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(10)
            .explain('executionStats') as any);

        const ftsWinningPlan = q2Explain?.queryPlanner?.winningPlan?.stage;
        console.log(`   - Winning Stage: ${ftsWinningPlan}`);
        console.log(`   - Index verification: ${JSON.stringify(q2Explain).includes('TEXT_MATCH') ? '✅ TEXT INDEX lookup hit' : '❌ SCAN'}`);
        console.log(`   - Total documents examined: ${q2Explain.executionStats?.totalDocsExamined ?? 0}`);

        // ─────────────────────────────────────────────────────────
        // Query 3: Multi-value tag match
        // ─────────────────────────────────────────────────────────
        console.log('\n⚡ Test 3: Array Tag Index Seek (Filtering tags)');
        const q3Start = Date.now();
        const q3Result = await Signal.find({ tags: 'trends' })
            .limit(20)
            .exec();
        const q3Latency = Date.now() - q3Start;
        console.log(`   - Latency: ${q3Latency} ms`);

        const q3Explain = await (Signal.find({ tags: 'trends' }).limit(20).explain('executionStats') as any);
        const tagsWinningPlan = q3Explain?.queryPlanner?.winningPlan?.stage || q3Explain?.queryPlanner?.winningPlan?.inputStage?.stage;
        console.log(`   - Winning Stage: ${tagsWinningPlan}`);
        console.log(`   - Index verification: ${JSON.stringify(q3Explain).includes('IXSCAN') ? '✅ IXSCAN (Tag array index hit)' : '❌ COLLSCAN'}`);

        console.log('\n📈 Benchmark analysis run completed successfully.\n');
    } catch (err: any) {
        console.error('❌ Benchmark profile error:', err.message);
    } finally {
        await disconnectDatabase();
    }
}

// Trigger query runs
runBenchmark();
