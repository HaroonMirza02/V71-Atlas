import { Request, Response } from 'express';
import { Signal, buildDedupHash } from '../models/Signal';
import { RawPayload } from '../models/Signal';
import { withCache, buildCacheKey, invalidateCachePattern } from '../lib/cache';
import { logger, auditLog } from '../lib/logger';
import { SignalCategory, SignalStatus } from '../types';
import mongoose from 'mongoose';

/** Parse pagination cursor string from Base64 */
function decodeCursor(cursorStr: string): { lastDiscoveredAt: Date; lastId: string } | null {
    try {
        const raw = Buffer.from(cursorStr, 'base64').toString('ascii');
        const parsed = JSON.parse(raw);
        if (!parsed.lastDiscoveredAt || !parsed.lastId) return null;
        return {
            lastDiscoveredAt: new Date(parsed.lastDiscoveredAt),
            lastId: parsed.lastId,
        };
    } catch {
        return null;
    }
}

/** Encode pagination cursor object to Base64 */
function encodeCursor(lastDiscoveredAt: Date, lastId: string): string {
    const payload = JSON.stringify({ lastDiscoveredAt: lastDiscoveredAt.toISOString(), lastId });
    return Buffer.from(payload).toString('base64');
}

export async function getSignals(req: Request, res: Response): Promise<void> {
    const {
        sourceId,
        category,
        status,
        tag,
        technology,
        search,
        limit = 20,
        cursor,
    } = req.query;

    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const userRole = req.user?.role || 'VIEWER';

    // Build filters object
    const filter: any = {};
    if (sourceId) filter.sourceId = String(sourceId);
    if (category) filter.category = String(category) as SignalCategory;
    if (status) filter.status = String(status) as SignalStatus;
    if (tag) filter.tags = String(tag);
    if (technology) filter.technologies = String(technology);

    // Full-text search expression
    if (search) {
        filter.$text = { $search: String(search) };
    }

    // Cursor pagination filter construction
    if (cursor) {
        const decoded = decodeCursor(String(cursor));
        if (decoded) {
            // Order: discoveredAt DESC, then _id DESC.
            // So fetch elements that are older than the cursor, or same age but smaller ID.
            filter.$or = [
                { discoveredAt: { $lt: decoded.lastDiscoveredAt } },
                {
                    discoveredAt: decoded.lastDiscoveredAt,
                    _id: { $lt: new mongoose.Types.ObjectId(decoded.lastId) }
                }
            ];
        }
    }

    // Cache key build (includes filters, limit, cursor position, and user permissions)
    const cacheKey = buildCacheKey('signals', {
        sourceId, category, status, tag, technology, search, parsedLimit, cursor
    }, userRole);

    try {
        const responsePayload = await withCache(
            cacheKey,
            async () => {
                // Query database
                let query = Signal.find(filter);

                // Sort: text relevance ranking if searching, otherwise discover timestamp
                if (search) {
                    query = (query as any).select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
                } else {
                    query = query.sort({ discoveredAt: -1, _id: -1 });
                }

                // Fetch one extra item to verify hasMore without triggering separate count queries
                const records = await query.limit(parsedLimit + 1).exec();

                const hasMore = records.length > parsedLimit;
                const resultRecords = hasMore ? records.slice(0, -1) : records;

                let nextCursor: string | undefined;
                if (resultRecords.length > 0) {
                    const lastItem = resultRecords[resultRecords.length - 1];
                    nextCursor = encodeCursor(lastItem.discoveredAt, lastItem.id);
                }

                return {
                    data: resultRecords,
                    pagination: {
                        cursor: hasMore ? nextCursor : undefined,
                        hasMore,
                        limit: parsedLimit,
                    },
                    meta: {
                        requestId: req.requestId || '',
                        timestamp: new Date().toISOString(),
                    },
                };
            }
        );

        res.json(responsePayload);
    } catch (err: any) {
        logger.error('Error fetching signals', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to query signals data' },
        });
    }
}

export async function getSignalById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
            error: { code: 'INVALID_ID', message: `Provided signal ID "${id}" is not a valid Mongo ObjectId` },
        });
        return;
    }

    const cacheKey = `atlas:signal:${id}`;

    try {
        const signalDetails = await withCache(
            cacheKey,
            async () => {
                // Fetch signal and populate creator/payload references
                const signal = await Signal.findById(id).populate('rawPayloadId').exec();
                if (!signal) throw new Error('SIGNAL_NOT_FOUND');
                return signal;
            },
            1800 // Cache single record for 30 minutes
        );

        res.json({ data: signalDetails });
    } catch (err: any) {
        if (err.message === 'SIGNAL_NOT_FOUND') {
            res.status(404).json({
                error: { code: 'SIGNAL_NOT_FOUND', message: `Signal with ID "${id}" does not exist` },
            });
            return;
        }

        logger.error('Error fetching signal details', { id, error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to access signal record details' },
        });
    }
}

export async function reviewSignal(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { status, reviewNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
            error: { code: 'INVALID_ID', message: `Provided signal ID "${id}" is not a valid Mongo ObjectId` },
        });
        return;
    }

    const validStatuses: SignalStatus[] = ['REVIEWED', 'ARCHIVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
            error: {
                code: 'INVALID_INPUT',
                message: `Status must be one of: ${validStatuses.join(', ')}`,
            },
        });
        return;
    }

    try {
        const signal = await Signal.findById(id);
        if (!signal) {
            res.status(404).json({
                error: { code: 'SIGNAL_NOT_FOUND', message: `Signal with ID "${id}" not found` },
            });
            return;
        }

        const beforeState = signal.toJSON();

        // Map changes
        signal.status = status;
        signal.reviewNotes = reviewNotes || signal.reviewNotes;
        signal.reviewedBy = new mongoose.Types.ObjectId(req.user!.id);
        signal.reviewedAt = new Date();

        const savedSignal = await signal.save();

        // Invalidate caches
        await invalidateCachePattern('signals');
        await invalidateCachePattern(`signal:${id}`);

        // Audit log
        auditLog({
            userId: req.user!.id,
            action: 'REVIEW_SIGNAL',
            resource: 'signal',
            resourceId: signal.id,
            outcome: 'success',
            details: {
                beforeStatus: beforeState.status,
                afterStatus: signal.status,
                notes: reviewNotes,
            },
        });

        res.json({
            message: 'Signal reviewed successfully',
            data: savedSignal,
        });
    } catch (err: any) {
        logger.error('Error reviewing signal', { id, error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to apply review updates to signal' },
        });
    }
}
