import {
    SourceConnector,
    RawRecord,
    NormalizedRecord,
    ValidationResult,
    RateLimitPolicy,
    ConnectorHealth,
    FetchResult,
    SignalCategory,
} from '../types';
import { buildDedupHash } from '../models/Signal';

/**
 * BaseConnector — provides shared validation logic and default implementations.
 * All concrete connectors should extend this class.
 */
export abstract class BaseConnector implements SourceConnector {
    abstract readonly sourceId: string;
    abstract readonly displayName: string;

    abstract fetchBatch(cursor?: string): Promise<FetchResult>;
    abstract normalize(raw: RawRecord): NormalizedRecord;
    abstract getRateLimitPolicy(): RateLimitPolicy;
    abstract healthCheck(): Promise<ConnectorHealth>;

    /**
     * Default validation — checks required fields and URL format.
     * Connectors can override for stricter rules.
     */
    validate(record: NormalizedRecord): ValidationResult {
        const errors: string[] = [];

        if (!record.title?.trim()) errors.push('title is required');
        if (!record.url?.trim()) errors.push('url is required');
        if (!record.sourceId) errors.push('sourceId is required');
        if (!record.externalId) errors.push('externalId is required');
        if (!record.dedupHash) errors.push('dedupHash is required');
        if (!record.category) errors.push('category is required');

        try {
            new URL(record.url);
        } catch {
            errors.push(`url is not a valid URL: "${record.url}"`);
        }

        return { valid: errors.length === 0, errors };
    }

    /** Build a dedup hash — delegates to shared utility */
    protected buildHash(externalId: string): string {
        return buildDedupHash(this.sourceId, externalId);
    }

    /** Infer category from keywords in title/description */
    protected inferCategory(text: string): SignalCategory {
        const lower = text.toLowerCase();
        if (/\b(job|hire|hiring|position|role|vacancy|engineer|developer)\b/.test(lower))
            return 'JOB_POSTING';
        if (/\b(open.?source|github|repository|repo|npm|library)\b/.test(lower))
            return 'OPEN_SOURCE';
        if (/\b(launch|product.?hunt|release|v\d+\.\d+|new release)\b/.test(lower))
            return 'PRODUCT_LAUNCH';
        if (/\b(funding|series [a-e]|investment|raised|million|vc|venture)\b/.test(lower))
            return 'FUNDING';
        if (/\b(pain.?point|problem|issue|struggle|frustrat|challeng|broken)\b/.test(lower))
            return 'PAIN_POINT';
        if (/\b(opportunit|market|growth|demand|trend|client|customer|prospect)\b/.test(lower))
            return 'BUSINESS_OPPORTUNITY';
        if (/\b(ai|ml|machine.?learning|blockchain|cloud|devops|kubernetes|llm|gpt)\b/.test(lower))
            return 'TECHNOLOGY_TREND';
        if (/\b(news|report|announce|press.?release)\b/.test(lower))
            return 'MARKET_NEWS';
        return 'OTHER';
    }

    /** Extract technology keywords from text */
    protected extractTechnologies(text: string): string[] {
        const techs = [
            'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript',
            'Go', 'Rust', 'Java', 'Kubernetes', 'Docker', 'AWS', 'GCP',
            'Azure', 'GraphQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka',
            'gRPC', 'Next.js', 'Vue', 'Angular', 'FastAPI', 'Flask',
            'Django', 'Ruby on Rails', 'Terraform', 'Ansible', 'Linux',
            'OpenAI', 'LLM', 'GPT', 'Claude', 'Gemini', 'Langchain',
        ];
        const lower = text.toLowerCase();
        return techs.filter((t) => lower.includes(t.toLowerCase()));
    }

    /** Safely truncate long strings */
    protected truncate(str: string, max: number): string {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '…' : str;
    }
}
