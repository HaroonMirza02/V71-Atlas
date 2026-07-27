import axios from 'axios';
import Parser from 'rss-parser';
import { GitHubConnector } from './github.connector';
import { HackerNewsConnector } from './hn.connector';
import { RemotiveConnector } from './remotive.connector';
import { RssConnector } from './rss.connector';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Upstream API Resilience (Conditions 1–4)', () => {
    let githubConnector: GitHubConnector;
    let hnConnector: HackerNewsConnector;
    let remotiveConnector: RemotiveConnector;
    let rssConnector: RssConnector;

    beforeEach(() => {
        jest.clearAllMocks();
        githubConnector = new GitHubConnector();
        hnConnector = new HackerNewsConnector();
        remotiveConnector = new RemotiveConnector();
        rssConnector = new RssConnector();
    });

    // ─────────────────────────────────────────────────────────────
    // Condition 1: Upstream API returns empty response
    // ─────────────────────────────────────────────────────────────
    describe('Condition 1: Upstream API returns empty response', () => {
        it('GitHubConnector handles empty items array gracefully without crashing', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { items: [] } });

            const result = await githubConnector.fetchBatch();
            expect(result.records).toEqual([]);
            expect(result.hasMore).toBe(false);
            expect(result.fetchedAt).toBeInstanceOf(Date);
        });

        it('HackerNewsConnector handles empty hits array gracefully without crashing', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { hits: [], nbPages: 0 } });

            const result = await hnConnector.fetchBatch();
            expect(result.records).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('RemotiveConnector handles empty jobs array gracefully without crashing', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { jobs: [] } });

            const result = await remotiveConnector.fetchBatch();
            expect(result.records).toEqual([]);
        });

        it('RssConnector handles empty items feed gracefully without crashing', async () => {
            jest.spyOn(Parser.prototype, 'parseURL').mockResolvedValueOnce({
                items: [],
                title: 'Empty Feed',
            } as any);

            const result = await rssConnector.fetchBatch();
            expect(result.records).toEqual([]);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Condition 2: Upstream API response schema changes
    // ─────────────────────────────────────────────────────────────
    describe('Condition 2: Upstream API response schema changes', () => {
        it('GitHubConnector safely normalizes records with missing or shifted fields', async () => {
            // Unexpected schema shape missing full_name, description, html_url, stargazers_count
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    items: [
                        { id: 98765 }, // bare minimal record
                    ],
                },
            });

            const result = await githubConnector.fetchBatch();
            expect(result.records).toHaveLength(1);

            const record = result.records[0];
            expect(record.externalId).toBe('98765');
            expect(record.title).toBe('');
            expect(record.description).toContain('No description provided');
            expect(record.url).toBe('');
            expect(record.metadata.stars).toBe(0);
        });

        it('HackerNewsConnector safely normalizes records with missing fields', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    hits: [
                        { objectID: '5551212' }, // missing title, author, points, url
                    ],
                    nbPages: 1,
                },
            });

            const result = await hnConnector.fetchBatch();
            expect(result.records).toHaveLength(1);

            const record = result.records[0];
            expect(record.externalId).toBe('5551212');
            expect(record.title).toBe('');
            expect(record.metadata.author).toBe('');
            expect(record.metadata.points).toBe(0);
            expect(record.url).toBe('https://news.ycombinator.com/item?id=5551212');
        });

        it('RssConnector safely handles feed items missing link or title', async () => {
            jest.spyOn(Parser.prototype, 'parseURL').mockResolvedValueOnce({
                title: 'Shifted RSS Feed',
                items: [{ title: undefined, link: null, content: 'Some content' }],
            } as any);

            const result = await rssConnector.fetchBatch();
            expect(result.records).toHaveLength(1);
            expect(result.records[0].title).toBe('Untitled RSS Item');
            expect(result.records[0].description).toBe('Some content');
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Condition 3: Rate limit hit on upstream API
    // ─────────────────────────────────────────────────────────────
    describe('Condition 3: Rate limit hit on upstream API', () => {
        it('GitHubConnector throws explicit error on 429 rate limit during fetchBatch', async () => {
            mockedAxios.get.mockRejectedValueOnce({
                response: {
                    status: 429,
                    data: { message: 'API rate limit exceeded for IP' },
                },
            });

            await expect(githubConnector.fetchBatch()).rejects.toThrow(
                /GitHub API error: API rate limit exceeded/
            );
        });

        it('GitHubConnector reports degraded health status on 403 rate limit during healthCheck', async () => {
            mockedAxios.get.mockRejectedValueOnce({
                response: {
                    status: 403,
                    data: { message: 'Rate limit hit' },
                },
            });

            const health = await githubConnector.healthCheck();
            expect(health.status).toBe('degraded');
            expect(health.error).toBe('Rate limit hit');
        });

        it('HackerNewsConnector reports unhealthy status when API hits rate limit or error', async () => {
            mockedAxios.get.mockRejectedValueOnce({
                message: 'Request failed with status code 429',
            });

            const health = await hnConnector.healthCheck();
            expect(health.status).toBe('unhealthy');
            expect(health.error).toBe('Request failed with status code 429');
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Condition 4: Request / upstream call times out
    // ─────────────────────────────────────────────────────────────
    describe('Condition 4: Request / upstream call times out', () => {
        it('GitHubConnector handles request timeout in fetchBatch without hanging', async () => {
            const timeoutError = new Error('timeout of 10000ms exceeded');
            (timeoutError as any).code = 'ECONNABORTED';

            mockedAxios.get.mockRejectedValueOnce(timeoutError);

            await expect(githubConnector.fetchBatch()).rejects.toThrow(
                /GitHub API error: timeout of 10000ms exceeded/
            );
        });

        it('GitHubConnector reports unhealthy on timeout during healthCheck', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded');
            (timeoutError as any).code = 'ECONNABORTED';

            mockedAxios.get.mockRejectedValueOnce(timeoutError);

            const health = await githubConnector.healthCheck();
            expect(health.status).toBe('unhealthy');
            expect(health.error).toBe('timeout of 5000ms exceeded');
        });

        it('HackerNewsConnector handles timeout gracefully in healthCheck', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded');
            (timeoutError as any).code = 'ECONNABORTED';

            mockedAxios.get.mockRejectedValueOnce(timeoutError);

            const health = await hnConnector.healthCheck();
            expect(health.status).toBe('unhealthy');
            expect(health.error).toBe('timeout of 5000ms exceeded');
        });
    });
});
