import { registry } from './registry';
import { RssConnector } from './rss.connector';
import { GitHubConnector } from './github.connector';
import { RemotiveConnector } from './remotive.connector';
import { HackerNewsConnector } from './hn.connector';
import {
    UpworkStubConnector,
    LinkedInStubConnector,
    FreelancerStubConnector,
    ProductHuntStubConnector,
} from './stubs';

// Register standard working connectors
registry.register(new RssConnector());
registry.register(new GitHubConnector());
registry.register(new RemotiveConnector());
registry.register(new HackerNewsConnector());

// Register future/stub connectors
registry.register(new UpworkStubConnector());
registry.register(new LinkedInStubConnector());
registry.register(new FreelancerStubConnector());
registry.register(new ProductHuntStubConnector());

export { registry };
