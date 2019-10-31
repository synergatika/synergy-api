import 'dotenv/config';
import App from './app';

// Controllers
import AuthenticationController from './controllers/authentication.controller';
import CustomersController from './controllers/customers.controller';
import MerchantsController from './controllers/merchants.controller';
import OffersController from './controllers/offers.controller';
import CampaignsController from './controllers/campaigns.controller'
import LoyaltyController from './controllers/loyalty.controller';
import HelpController from './controllers/help.controller';

import validateEnv from './utils/validateEnv';

validateEnv();

const app = new App(
  [
    new AuthenticationController(),
    new CustomersController(),
    new MerchantsController(),
    new OffersController(),
    new CampaignsController(),
    new LoyaltyController(),
    new HelpController()
  ],
);

app.listen();