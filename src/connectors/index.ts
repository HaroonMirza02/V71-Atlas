import { registry } from './registry';
import { RssConnector } from './rss.connector';
import { GitHubConnector } from './github.connector';
import { RemotiveConnector } from './remotive.connector';
import { HackerNewsConnector } from './hn.connector';
import { ProductHuntConnector } from './producthunt.connector';
import { config } from '../config';

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

// Dynamically register Product Hunt if enabled, otherwise use stub
if (config.PRODUCT_HUNT_ENABLED) {
    registry.register(new ProductHuntConnector());
} else {
    registry.register(new ProductHuntStubConnector());
}

// Register future/stub connectors
registry.register(new UpworkStubConnector());
registry.register(new LinkedInStubConnector());
registry.register(new FreelancerStubConnector());

export { registry };
