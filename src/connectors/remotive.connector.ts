import axios from 'axios';
import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';
import { config } from '../config';

export class RemotiveConnector extends BaseConnector {
    readonly sourceId = 'remotive';
    readonly displayName = 'Remotive Remote Jobs API';

    async fetchBatch(cursor?: string): Promise<FetchResult> {
        // Parse categories from configuration
        const categories = config.REMOTIVE_CATEGORIES.split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        // Track category progress using cursor (e.g. "catIndex:1")
        let catIndex = 0;
        if (cursor && cursor.startsWith('catIndex:')) {
            catIndex = parseInt(cursor.split(':')[1], 10) || 0;
        }

        if (categories.length === 0 || catIndex >= categories.length) {
            return {
                records: [],
                hasMore: false,
                fetchedAt: new Date(),
            };
        }

        const currentCategory = categories[catIndex];
        const url = `${config.REMOTIVE_API_URL}`;

        try {
            const response = await axios.get(url, {
                params: {
                    category: currentCategory,
                    limit: 30, // Get top 30 jobs
                },
                timeout: 120000, // Large payload could take time
            });

            const jobs = response.data.jobs || [];
            const records = jobs.map((job: RawRecord) => this.normalize(job));

            const hasMore = catIndex + 1 < categories.length;
            const nextCursor = hasMore ? `catIndex:${catIndex + 1}` : undefined;

            return {
                records,
                nextCursor,
                hasMore,
                fetchedAt: new Date(),
            };
        } catch (err: any) {
            throw new Error(`Remotive API error on category "${currentCategory}": ${err.message}`);
        }
    }

    normalize(raw: RawRecord): NormalizedRecord {
        const extId = String(raw.id || '');
        const title = String(raw.title || 'Remote Job Opportunity');
        const description = String(raw.description || '');
        const company = String(raw.company_name || '');
        const salary = String(raw.salary || '');

        const textToScan = `${title} ${description}`;
        const technologies = this.extractTechnologies(textToScan);

        // Extract tags
        const tags = ['job-posting', 'remote', 'remotive'];
        if (raw.category) tags.push(String(raw.category).toLowerCase().replace(/\s+/g, '-'));
        if (raw.job_type) tags.push(String(raw.job_type).toLowerCase());
        if (raw.candidate_required_location) {
            tags.push(String(raw.candidate_required_location).toLowerCase().replace(/\s+/g, '-'));
        }

        // Try parsing budget/salary if numeric value exists
        let budget: number | undefined;
        const numericMatch = salary.match(/\b\d+[\d,]*\b/);
        if (numericMatch) {
            budget = parseInt(numericMatch[0].replace(/,/g, ''), 10);
        }

        const publishedAt = raw.publication_date ? new Date(String(raw.publication_date)) : new Date();

        return {
            dedupHash: this.buildHash(extId),
            sourceId: this.sourceId,
            externalId: extId,
            title,
            description: this.truncate(description.replace(/<[^>]*>/g, ''), 1000), // Clean HTML and truncate
            category: 'JOB_POSTING',
            url: String(raw.url || ''),
            tags: Array.from(new Set(tags)).slice(0, 15),
            technologies: Array.from(new Set(technologies)),
            company,
            location: String(raw.candidate_required_location || 'Remote'),
            budget,
            currency: salary.includes('€') ? 'EUR' : salary.includes('£') ? 'GBP' : 'USD',
            publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
            metadata: {
                salaryStr: salary,
                companyLogo: String(raw.company_logo || ''),
            },
        };
    }

    getRateLimitPolicy(): RateLimitPolicy {
        return {
            requestsPerWindow: 20,
            windowMs: 60000,
            adaptive: true,
        };
    }

    async healthCheck(): Promise<ConnectorHealth> {
        const startTime = Date.now();
        try {
            // Fetch dynamic API status by hitting the URL with strict limit and timeout
            await axios.get(`${config.REMOTIVE_API_URL}`, {
                params: { limit: 1 },
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
