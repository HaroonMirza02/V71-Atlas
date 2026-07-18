import axios from 'axios';
import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';
import { config } from '../config';

export class HackerNewsConnector extends BaseConnector {
    readonly sourceId = 'hackernews';
    readonly displayName = 'HackerNews Algolia API';

    async fetchBatch(cursor?: string): Promise<FetchResult> {
        let page = 0;
        if (cursor && cursor.startsWith('page:')) {
            page = parseInt(cursor.split(':')[1], 10) || 0;
        }

        const url = `${config.HN_API_URL}/search_by_date`;
        const query = 'show hn OR pain point OR launch OR show_hn';

        try {
            const response = await axios.get(url, {
                params: {
                    query,
                    tags: 'story',
                    numericFilters: 'points>5', // trending items only
                    page,
                    hitsPerPage: 20,
                },
                timeout: 10000,
            });

            const hits = response.data.hits || [];
            const records = hits.map((hit: RawRecord) => this.normalize(hit));

            const totalPages = Number(response.data.nbPages || 0);
            const hasMore = hits.length === 20 && page + 1 < Math.min(totalPages, 5); // Max 5 pages
            const nextCursor = hasMore ? `page:${page + 1}` : undefined;

            return {
                records,
                nextCursor,
                hasMore,
                fetchedAt: new Date(),
            };
        } catch (err: any) {
            throw new Error(`HackerNews API error: ${err.message}`);
        }
    }

    normalize(raw: RawRecord): NormalizedRecord {
        const extId = String(raw.objectID || '');
        const title = String(raw.title || '');
        const description = String(raw.story_text || '');
        const author = String(raw.author || '');
        const points = Number(raw.points || 0);
        const commentsCount = Number(raw.num_comments || 0);
        const itemUrl = String(raw.url || `https://news.ycombinator.com/item?id=${extId}`);

        const textToScan = `${title} ${description}`;
        const category = this.inferCategory(textToScan);
        const technologies = this.extractTechnologies(textToScan);
        const tags = ['hackernews', 'hn-story', `author-${author}`];

        if (Array.isArray(raw._tags)) {
            (raw._tags as string[]).forEach((t) => tags.push(t));
        }

        const publishedAt = raw.created_at ? new Date(String(raw.created_at)) : new Date();

        return {
            dedupHash: this.buildHash(extId),
            sourceId: this.sourceId,
            externalId: extId,
            title,
            description: description || `Trending HackerNews post by ${author} with ${points} points.`,
            category,
            url: itemUrl,
            tags: Array.from(new Set(tags)).slice(0, 15),
            technologies: Array.from(new Set(technologies)),
            publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
            metadata: {
                points,
                commentsCount,
                author,
                hnUrl: `https://news.ycombinator.com/item?id=${extId}`,
            },
        };
    }

    getRateLimitPolicy(): RateLimitPolicy {
        return {
            requestsPerWindow: 100,
            windowMs: 60000,
            adaptive: false,
        };
    }

    async healthCheck(): Promise<ConnectorHealth> {
        const startTime = Date.now();
        try {
            await axios.get(`${config.HN_API_URL}/search`, {
                params: { query: 'test', hitsPerPage: 1 },
                timeout: 5000,
            });
            return {
                connectorId: this.sourceId,
                status: 'healthy',
                lastChecked: new Date(),
                latencyMs: Date.now() - startTime,
            };
        } catch (err: any) {
            return {
                connectorId: this.sourceId,
                status: 'unhealthy',
                lastChecked: new Date(),
                latencyMs: Date.now() - startTime,
                error: err.message,
            };
        }
    }
}
