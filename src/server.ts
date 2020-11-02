import 'dotenv/config';
import App from './app';

// Controllers
import AuthenticationController from './controllers/authentication.controller';
import MembersController from './controllers/members.controller';
import PartnersController from './controllers/partners.controller';
import OffersController from './controllers/offers.controller';
import MicrocreditController from './controllers/microcredit.controller';
import MicrocreditCampaignsController from './controllers/microcredit_campaigns.controller';
import MicrocreditSupportsController from './controllers/microcredit_supports.controller';
import LoyaltyController from './controllers/loyalty.controller';
import PostsController from './controllers/posts.controller';
import EventsController from './controllers/events.controller';
import CommunityController from './controllers/community.controller';
import HelpController from './controllers/help.controller';
import ContentController from './controllers/content.controller';
import UsersController from './controllers/users.controller';

import validateEnv from './utils/validateEnv';
import ReEstablishController from './controllers/re-establish.controller';

validateEnv();

const app = new App(
  [
    new AuthenticationController(),
    new MembersController(),
    new PartnersController(),
    new LoyaltyController(),
    new OffersController(),
    new MicrocreditController(),
    new MicrocreditCampaignsController(),
    new MicrocreditSupportsController(),
    new CommunityController(),
    new PostsController(),
    new EventsController(),
    new HelpController(),
    new ContentController(),
    new UsersController(),
    new ReEstablishController()
  ],
);

app.listen();
