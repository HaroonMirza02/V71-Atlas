import { SourceConnector, ConnectorHealth } from '../types';
import { logger } from '../lib/logger';
import { ConnectorState } from '../models/ConnectorState';

/**
 * ConnectorRegistry — single source of truth for all registered connectors.
 *
 * Adding a new connector requires ONLY:
 *   1. Implement the SourceConnector interface
 *   2. Call registry.register(new MyConnector())
 *
 * Zero changes needed in: database, API, queue, workers.
 */
class ConnectorRegistry {
    private connectors = new Map<string, SourceConnector>();

    /** Register a connector. Throws if sourceId already registered. */
    register(connector: SourceConnector): void {
        if (this.connectors.has(connector.sourceId)) {
            throw new Error(`Connector with sourceId "${connector.sourceId}" is already registered`);
        }
        this.connectors.set(connector.sourceId, connector);
        logger.info('Connector registered', {
            sourceId: connector.sourceId,
            displayName: connector.displayName,
        });
    }

    /** Get a connector by its sourceId — throws if not found */
    get(sourceId: string): SourceConnector {
        const connector = this.connectors.get(sourceId);
        if (!connector) {
            throw new Error(`Connector "${sourceId}" not found in registry`);
        }
        return connector;
    }

    /** Get all registered connectors */
    getAll(): SourceConnector[] {
        return Array.from(this.connectors.values());
    }

    /** Get all registered sourceIds */
    getIds(): string[] {
        return Array.from(this.connectors.keys());
    }

    /** Check if a connector is registered */
    has(sourceId: string): boolean {
        return this.connectors.has(sourceId);
    }

    /** Run health checks on all connectors (in parallel, failures isolated) */
    async healthCheckAll(): Promise<ConnectorHealth[]> {
        const results = await Promise.allSettled(
            this.getAll().map((c) => c.healthCheck())
        );

        return results.map((result, i) => {
            const connector = this.getAll()[i];
            if (result.status === 'fulfilled') {
                return result.value;
            }
            logger.warn('Health check failed', {
                sourceId: connector.sourceId,
                error: (result.reason as Error).message,
            });
            return {
                connectorId: connector.sourceId,
                status: 'unhealthy' as const,
                lastChecked: new Date(),
                error: (result.reason as Error).message,
            };
        });
    }

    /** Ensure a ConnectorState document exists in MongoDB for every registered connector */
    async syncStatesToDB(): Promise<void> {
        const ids = this.getIds();
        await Promise.all(
            ids.map((connectorId) =>
                ConnectorState.findOneAndUpdate(
                    { connectorId },
                    { $setOnInsert: { connectorId } },
                    { upsert: true, returnDocument: 'after' }
                )
            )
        );
        logger.info('Connector states synced to DB', { count: ids.length });
    }
}

// Singleton export
export const registry = new ConnectorRegistry();
