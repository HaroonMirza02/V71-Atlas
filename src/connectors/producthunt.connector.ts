import axios from 'axios';
import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';
import { config } from '../config';

export class ProductHuntConnector extends BaseConnector {
    readonly sourceId = 'producthunt';
    readonly displayName = 'Product Hunt API';

    async fetchBatch(cursor?: string): Promise<FetchResult> {
        // Only fetch if we have a token
        if (!config.PRODUCT_HUNT_API_DEVELOPER_TOKEN && !config.PRODUCT_HUNT_API_CLIENT_TOKEN) {
            throw new Error('Product Hunt API token is missing');
        }

        const token = config.PRODUCT_HUNT_API_DEVELOPER_TOKEN || config.PRODUCT_HUNT_API_CLIENT_TOKEN;

        const query = `
            query($cursor: String) {
                posts(first: 20, after: $cursor) {
                    edges {
                        node {
                            id
                            name
                            tagline
                            description
                            url
                            votesCount
                            createdAt
                            topics {
                                edges {
                                    node {
                                        name
                                    }
                                }
                            }
                            user {
                                name
                            }
                        }
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        `;

        try {
            const response = await axios.post(
                'https://api.producthunt.com/v2/api/graphql',
                {
                    query,
                    variables: { cursor: cursor || null }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000,
                }
            );

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            const data = response.data.data.posts;
            const edges = data.edges || [];
            
            const records = edges.map((edge: any) => this.normalize(edge.node));

            return {
                records,
                nextCursor: data.pageInfo.hasNextPage ? data.pageInfo.endCursor : undefined,
                hasMore: data.pageInfo.hasNextPage,
                fetchedAt: new Date(),
            };
        } catch (err: any) {
            throw new Error(`Product Hunt API error: ${err.message}`);
        }
    }

    normalize(raw: RawRecord): NormalizedRecord {
        const extId = String(raw.id);
        const title = String(raw.name);
        const description = `${raw.tagline} - ${raw.description || ''}`;
        const itemUrl = String(raw.url);
        const votes = Number(raw.votesCount || 0);
        const author = raw.user ? raw.user.name : 'Unknown';

        const rawTopics = raw.topics?.edges?.map((t: any) => t.node.name) || [];
        
        const category = this.inferCategory(`${title} ${description} ${rawTopics.join(' ')}`);
        const technologies = this.extractTechnologies(`${title} ${description}`);
        const tags = ['producthunt', 'startup', ...rawTopics];

        const publishedAt = raw.createdAt ? new Date(raw.createdAt) : new Date();

        return {
            dedupHash: this.buildHash(extId),
            sourceId: this.sourceId,
            externalId: extId,
            title,
            description,
            category,
            url: itemUrl,
            tags: Array.from(new Set(tags)).slice(0, 15),
            technologies: Array.from(new Set(technologies)),
            publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
            metadata: {
                votes,
                author,
                topics: rawTopics
            },
        };
    }

    getRateLimitPolicy(): RateLimitPolicy {
        return {
            requestsPerWindow: 900,
            windowMs: 900000, // 15 mins
            adaptive: false,
        };
    }

    async healthCheck(): Promise<ConnectorHealth> {
        const startTime = Date.now();
        try {
            const token = config.PRODUCT_HUNT_API_DEVELOPER_TOKEN || config.PRODUCT_HUNT_API_CLIENT_TOKEN;
            if (!token) throw new Error('Missing token');

            await axios.post(
                'https://api.producthunt.com/v2/api/graphql',
                { query: '{ viewer { user { name } } }' },
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000,
                }
            );
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
