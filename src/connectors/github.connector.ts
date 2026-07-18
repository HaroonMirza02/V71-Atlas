import axios from 'axios';
import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';
import { config } from '../config';

export class GitHubConnector extends BaseConnector {
    readonly sourceId = 'github';
    readonly displayName = 'GitHub Search API';

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Project-Atlas-Market-Intelligence',
        };
        if (config.GITHUB_TOKEN) {
            headers.Authorization = `token ${config.GITHUB_TOKEN}`;
        }
        return headers;
    }

    async fetchBatch(cursor?: string): Promise<FetchResult> {
        // Parser cursor (e.g. "page:2") or default to 1
        let page = 1;
        if (cursor && cursor.startsWith('page:')) {
            page = parseInt(cursor.split(':')[1], 10) || 1;
        }

        const query = config.GITHUB_SEARCH_QUERY || 'market intelligence';
        const url = `${config.GITHUB_API_URL}/search/repositories`;

        try {
            const response = await axios.get(url, {
                params: {
                    q: query,
                    sort: 'updated',
                    order: 'desc',
                    page,
                    per_page: 20,
                },
                headers: this.getHeaders(),
                timeout: 10000,
            });

            const items = response.data.items || [];
            const records = items.map((item: RawRecord) => this.normalize(item));

            const hasMore = items.length === 20 && page < 5; // limit to 5 pages per run
            const nextCursor = hasMore ? `page:${page + 1}` : undefined;

            return {
                records,
                nextCursor,
                hasMore,
                fetchedAt: new Date(),
            };
        } catch (err: any) {
            throw new Error(`GitHub API error: ${err.response?.data?.message || err.message}`);
        }
    }

    normalize(raw: RawRecord): NormalizedRecord {
        const extId = String(raw.id || '');
        const repoName = String(raw.full_name || '');
        const description = String(raw.description || '');
        const stars = Number(raw.stargazers_count || 0);
        const forks = Number(raw.forks_count || 0);

        const textToScan = `${repoName} ${description}`;
        const category = this.inferCategory(textToScan);
        const technologies = this.extractTechnologies(textToScan);

        // Extract tags
        const tags = Array.isArray(raw.topics) ? (raw.topics as string[]) : [];
        if (raw.language) {
            tags.push(String(raw.language).toLowerCase());
            technologies.push(String(raw.language));
        }
        tags.push('github', 'repo');

        return {
            dedupHash: this.buildHash(extId),
            sourceId: this.sourceId,
            externalId: extId,
            title: repoName,
            description: description || `No description provided for repository ${repoName}`,
            category,
            url: String(raw.html_url || ''),
            tags: Array.from(new Set(tags)),
            technologies: Array.from(new Set(technologies)),
            metadata: {
                stars,
                forks,
                watchers: Number(raw.watchers_count || 0),
                owner: (raw.owner as Record<string, any>)?.login || '',
                createdAt: raw.created_at,
                updatedAt: raw.updated_at,
            },
        };
    }

    getRateLimitPolicy(): RateLimitPolicy {
        // Unauthenticated: 10 requests per minute
        // Authenticated: 30 requests per minute
        return {
            requestsPerWindow: config.GITHUB_TOKEN ? 30 : 10,
            windowMs: 60000,
            adaptive: true,
        };
    }

    async healthCheck(): Promise<ConnectorHealth> {
        const startTime = Date.now();
        try {
            // Light check requesting api rate_limit endpoint
            await axios.get(`${config.GITHUB_API_URL}/rate_limit`, {
                headers: this.getHeaders(),
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
                status: err.response?.status === 403 ? 'degraded' : 'unhealthy',
                lastChecked: new Date(),
                latencyMs: Date.now() - startTime,
                error: err.response?.data?.message || err.message,
            };
        }
    }
}
