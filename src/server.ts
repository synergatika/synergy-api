
import 'dotenv/config';
import App from './app';
import AuthenticationController from './controllers/authentication.controller';
import CustomersController from './controllers/customers.controller';
import MerchantsController from './controllers/merchants.controller';
import PostsController from './posts/posts.controller';
import validateEnv from './utils/validateEnv';

validateEnv();

const app = new App(
  [
    new PostsController(),
    new AuthenticationController(),
    new CustomersController(),
    new MerchantsController()
  ],
);

app.listen();