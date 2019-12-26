import * as express from 'express';
import * as mongoose from 'mongoose';
import to from 'await-to-ts';

const path = require('path');

// Eth
import { BlockchainService } from '../utils/blockchainService';

import Transporter from '../utils/mailer';

// Exceptions
import NotFoundException from '../exceptions/NotFound.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';

class HelpController implements Controller {
  public path = '/status';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.establishing);
  }

  private establishing = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const {
      API_VERSION,
      DB_HOST,
      DB_PORT,
      DB_NAME,
      DB_USER,
      DB_PASSWORD,
      ETH_REMOTE_API,
      ETH_CONTRACTS_PATH,
      ETH_API_ACCOUNT_PRIVKEY
    } = process.env;

    let serviceInstance = null;
    try {
      serviceInstance = new BlockchainService(ETH_REMOTE_API, path.join(__dirname, ETH_CONTRACTS_PATH), ETH_API_ACCOUNT_PRIVKEY);
    } catch (error) {
      console.error('Blockchain connection is limited');
    }

    let start_time = new Date().getTime(), end_time = 0;
    let error, conn;
    [error, conn] = await to(mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }).catch());
    end_time = new Date().getTime();

    const result: any = {
      api_version: API_VERSION
    };

    if (serviceInstance == null) {
      result['ethereum_api_status'] = false;
    } else {
      result['ethereum_api_status'] = true;
      result['ethereum_api_address'] = serviceInstance.address.from;
      result['ethereum_api_url'] = ETH_REMOTE_API;
      result['ethereum_api_status'] = await serviceInstance.isConnected();
      result['ethereum_api_balance'] = parseInt(await serviceInstance.getBalance());
    }

    if (error) {
      result['db_connection_status'] = false;
    } else {
      result['db_connection_status'] = true;
      result['db_time_to_connect'] = (end_time - start_time) + "ms";
    }

    let smtpIsOnline = false;
    try {
      smtpIsOnline = await Transporter.verify();
    } catch (error) {
      console.error('SMTP connection is limited');
    }

    result['smtp_status'] = smtpIsOnline;

    response.status(200).send(result);
  }
}
export default HelpController;
