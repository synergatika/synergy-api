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

  private checkEthereum = async (result: any) => {
    const {
      ETH_REMOTE_API,
      ETH_CONTRACTS_PATH,
      ETH_API_ACCOUNT_PRIVKEY
    } = process.env;

    const timeOutPromise = new Promise(function(resolve, reject) {
      setTimeout(() => {
        resolve(false);
      }, 5000);
    });

    let start_time = new Date().getTime(), end_time = 0;
    let serviceInstance = null;
    try {
      serviceInstance = new BlockchainService(ETH_REMOTE_API, path.join(__dirname, ETH_CONTRACTS_PATH), ETH_API_ACCOUNT_PRIVKEY);
      if (serviceInstance == null) {
        result['ethereum_api_status'] = false;
      } else {
        const status = await Promise.race([timeOutPromise, serviceInstance.isConnected()]);

        result['ethereum_api_status'] = status;
        result['ethereum_api_url'] = ETH_REMOTE_API;
        result['ethereum_api_address'] = serviceInstance.address.from;
        if (status) {
          result['ethereum_loyalty_app_address'] = await serviceInstance.getLoyaltyAppAddress();
          result['ethereum_api_balance'] = parseInt(await serviceInstance.getBalance());
        }
      }
    } catch (error) {
      result['ethereum_api_status'] = false;
      console.error('Blockchain connection is limited');
    }
    end_time = new Date().getTime();
    result['ethereum_time_to_connect'] = Number(end_time - start_time);

    return result;
  }

  private checkMongoDB = async (result: any) => {
    const {
      DB_HOST,
      DB_PORT,
      DB_NAME,
      DB_USER,
      DB_PASSWORD
    } = process.env;

    const timeOutPromise = new Promise(function(resolve, reject) {
      setTimeout(() => {
        resolve([true, null]);
      }, 5000);
    });

    let start_time = new Date().getTime(), end_time = 0;
    let error, conn;
    [error, conn] = await Promise.race([to(mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      reconnectTries: 5,
      reconnectInterval: 500, // in ms
    }).catch()), timeOutPromise]) as any;
    end_time = new Date().getTime();

    result['db_time_to_connect'] = Number(end_time - start_time);
    if (error) {
      result['db_connection_status'] = false;
    } else {
      result['db_connection_status'] = true;
    }

    return result;
  }

  private checkSMTP = async (result: any) => {
    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USER,
      EMAIL_FROM
    } = process.env;

    let start_time = new Date().getTime(), end_time = 0;
    let smtpIsOnline = false;
    try {
      smtpIsOnline = await Transporter.verify();
    } catch (error) {
      console.error('SMTP connection is limited');
    }
    end_time = new Date().getTime();

    result['smtp_time_to_connect'] = Number(end_time - start_time);
    result['smtp_status'] = smtpIsOnline;
    if (smtpIsOnline == false) {
      result['smtp_email_host'] = EMAIL_HOST;
      result['smtp_email_port'] = Number(EMAIL_PORT);
      result['smtp_email_user'] = EMAIL_USER;
      result['smtp_email_from'] = EMAIL_FROM;
    }

    return result;
  }

  private establishing = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    let result: any = {
      api_version: process.env.API_VERSION
    };

    result = await this.checkEthereum(result);
    result = await this.checkMongoDB(result);
    result = await this.checkSMTP(result);

    response.status(200).send(result);

    next();
  }
}
export default HelpController;
