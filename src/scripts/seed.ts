import { connectDatabase, disconnectDatabase } from '../lib/database';
import { Signal, buildDedupHash } from '../models/Signal';
import { RawPayload } from '../models/Signal';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { SignalCategory, SignalStatus, UserRole } from '../types';

const CATEGORIES: SignalCategory[] = [
    'TECHNOLOGY_TREND',
    'BUSINESS_OPPORTUNITY',
    'PAIN_POINT',
    'POTENTIAL_CLIENT',
    'JOB_POSTING',
    'OPEN_SOURCE',
    'PRODUCT_LAUNCH',
    'MARKET_NEWS',
    'FUNDING',
    'OTHER',
];

const SOURCES = ['github', 'rss', 'remotive', 'hackernews'];
const TECHS = ['React', 'Node.js', 'TypeScript', 'Python', 'Kubernetes', 'Docker', 'AWS', 'MongoDB', 'Redis', 'OpenAI'];
const TAGS = ['trends', 'startup', 'innovation', 'remote', 'saas', 'funding', 'agile', 'ai', 'devops'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubarray<T>(arr: T[], maxItems = 3): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * maxItems) + 1);
}

async function runSeed() {
    // Parse command arguments: e.g. npm run seed -- --size=100
    const args = process.argv.slice(2);
    const sizeArg = args.find((arg) => arg.startsWith('--size='));
    const sizeVal = sizeArg ? parseInt(sizeArg.split('=')[1], 10) : 100;

    console.log(`\n🌱 Starting seed execution for: ${sizeVal.toLocaleString()} records`);

    await connectDatabase();

    // Recreate indexes (critical after schema collection drops)
    console.log('Building search and query indexes...');
    await Promise.all([
        Signal.createIndexes(),
        RawPayload.createIndexes(),
    ]);

    const startTime = Date.now();

    try {
        // 1. Core Users Seed (Admin, Analyst, Viewer) if none exists
        const usersCount = await User.countDocuments();
        if (usersCount === 0) {
            console.log('Inserting default users...');
            const admin = new User({
                email: 'admin@vision71.com',
                password: 'Password123!',
                name: 'System Admin',
                role: 'ADMIN' as UserRole,
            });
            const analyst = new User({
                email: 'analyst@vision71.com',
                password: 'Password123!',
                name: 'Market Analyst',
                role: 'ANALYST' as UserRole,
            });
            const viewer = new User({
                email: 'viewer@vision71.com',
                password: 'Password123!',
                name: 'Project Viewer',
                role: 'VIEWER' as UserRole,
            });

            await Promise.all([admin.save(), analyst.save(), viewer.save()]);
            console.log('✅ Default credentials seeded:');
            console.log('   - admin@vision71.com / Password123! [ADMIN]');
            console.log('   - analyst@vision71.com / Password123! [ANALYST]');
            console.log('   - viewer@vision71.com / Password123! [VIEWER]');
        }

        // 2. Perform bulk insertion in optimized chunks of 10,000
        const chunkSize = 10000;
        let recordsCreated = 0;

        console.log('Generating records payload. Please stand by...');

        while (recordsCreated < sizeVal) {
            const currentChunkSize = Math.min(chunkSize, sizeVal - recordsCreated);
            const signalsChunk: any[] = [];
            const rawPayloadsChunk: any[] = [];

            for (let i = 0; i < currentChunkSize; i++) {
                const idVal = recordsCreated + i;
                const sourceId = getRandomItem(SOURCES);
                const externalId = `mock-${idVal}-${Math.random().toString(36).substring(2, 7)}`;
                const dedupHash = buildDedupHash(sourceId, externalId);

                const title = `Trending post detail #${idVal} on market opportunities`;
                const description = `This is a simulated description for mock record ${idVal} detailing strategic pain points, integration patterns or business outcomes.`;
                const category = getRandomItem(CATEGORIES);
                const url = `https://example.com/signals/${sourceId}/${externalId}`;
                const tags = getRandomSubarray(TAGS, 4);
                const technologies = getRandomSubarray(TECHS, 3);

                const rawId = new mongoose.Types.ObjectId();

                rawPayloadsChunk.push({
                    _id: rawId,
                    sourceId,
                    externalId,
                    payload: { originalIdx: idVal, simulatedSeed: true },
                    connectorVersion: '1.0.0',
                });

                signalsChunk.push({
                    dedupHash,
                    sourceId,
                    externalId,
                    rawPayloadId: rawId,
                    title,
                    description,
                    category,
                    status: 'PENDING' as SignalStatus,
                    url,
                    tags,
                    technologies,
                    company: idVal % 5 === 0 ? `Company-${idVal}` : undefined,
                    location: idVal % 7 === 0 ? 'San Francisco, CA' : undefined,
                    budget: idVal % 10 === 0 ? 5000 + (idVal % 5) * 1000 : undefined,
                    currency: 'USD',
                    publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    discoveredAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
                    lastSeenAt: new Date(),
                    metadata: {},
                });
            }

            // Execute bulk insert and skip validation locks
            await RawPayload.collection.insertMany(rawPayloadsChunk, { ordered: false });
            await Signal.collection.insertMany(signalsChunk, { ordered: false });

            recordsCreated += currentChunkSize;
            const progress = ((recordsCreated / sizeVal) * 100).toFixed(0);
            console.log(`   Processed ${recordsCreated.toLocaleString()} / ${sizeVal.toLocaleString()} (${progress}%)`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Database seeding complete!`);
        console.log(`   Total Records Saved: ${recordsCreated.toLocaleString()}`);
        console.log(`   Time Ellapsed: ${duration} seconds`);

    } catch (err: any) {
        console.error('❌ Seeding failure:', err.stack || err.message);
    } finally {
        await disconnectDatabase();
    }
}

// Trigger run
runSeed();
