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

    /** Extract technology keywords from text with strict regex word boundaries */
    protected extractTechnologies(text: string): string[] {
        if (!text) return [];

        const TECH_RULES: Array<{ name: string; pattern: RegExp }> = [
            { name: 'React', pattern: /\b(react|react\.js|reactjs|react\s+native)\b/i },
            { name: 'Node.js', pattern: /\b(node|node\.js|nodejs|express\.js)\b/i },
            { name: 'Python', pattern: /\b(python|python3|pytest)\b/i },
            { name: 'TypeScript', pattern: /\b(typescript)\b/i },
            { name: 'JavaScript', pattern: /\b(javascript|ecmascript|es6)\b/i },
            { name: 'Golang', pattern: /\b(golang|golang\s+developer|go\s+backend|go\s+microservices|built\s+with\s+go|written\s+in\s+go|go\s+programming)\b/i },
            { name: 'Rust', pattern: /\b(rust|rustlang)\b/i },
            { name: 'Java', pattern: /\b(java|spring\s+boot|springframework)\b/i },
            { name: 'C++', pattern: /\b(c\+\+|cpp)\b/i },
            { name: 'C#', pattern: /\b(c#|\.net|dotnet|asp\.net)\b/i },
            { name: 'PHP', pattern: /\b(php|laravel|symfony|wordpress)\b/i },
            { name: 'Ruby', pattern: /\b(ruby|rails|ruby\s+on\s+rails)\b/i },
            { name: 'Kubernetes', pattern: /\b(kubernetes|k8s|helm)\b/i },
            { name: 'Docker', pattern: /\b(docker|dockerfile|containerization)\b/i },
            { name: 'AWS', pattern: /\b(aws|amazon\s+web\s+services|ec2|s3|lambda|dynamodb)\b/i },
            { name: 'GCP', pattern: /\b(gcp|google\s+cloud|cloud\s+run)\b/i },
            { name: 'Azure', pattern: /\b(azure|microsoft\s+azure)\b/i },
            { name: 'GraphQL', pattern: /\b(graphql|apollo)\b/i },
            { name: 'PostgreSQL', pattern: /\b(postgres|postgresql|psql)\b/i },
            { name: 'MongoDB', pattern: /\b(mongodb|mongoose)\b/i },
            { name: 'Redis', pattern: /\b(redis|ioredis)\b/i },
            { name: 'Kafka', pattern: /\b(kafka|apache\s+kafka)\b/i },
            { name: 'gRPC', pattern: /\b(grpc)\b/i },
            { name: 'Next.js', pattern: /\b(next\.js|nextjs)\b/i },
            { name: 'Vue.js', pattern: /\b(vue|vue\.js|vuejs|nuxt)\b/i },
            { name: 'Angular', pattern: /\b(angular|angularjs)\b/i },
            { name: 'FastAPI', pattern: /\b(fastapi)\b/i },
            { name: 'Flask', pattern: /\b(flask)\b/i },
            { name: 'Django', pattern: /\b(django)\b/i },
            { name: 'Terraform', pattern: /\b(terraform)\b/i },
            { name: 'Ansible', pattern: /\b(ansible)\b/i },
            { name: 'Linux', pattern: /\b(linux|ubuntu|debian|centos)\b/i },
            { name: 'OpenAI / LLM', pattern: /\b(openai|llm|gpt-?4|claude|gemini|langchain|ollama|vector\s+db)\b/i },
        ];

        const matches: string[] = [];
        for (const rule of TECH_RULES) {
            if (rule.pattern.test(text)) {
                matches.push(rule.name);
            }
        }
        return matches;
    }

    /** Safely truncate long strings */
    protected truncate(str: string, max: number): string {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '…' : str;
    }
}
