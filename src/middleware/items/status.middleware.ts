import { NextFunction, Response } from 'express';
var path = require('path');

/**
 * Blockchain Service
 */
import { BlockchainService } from '../../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';

async function blockchain_status(request: RequestWithUser, response: Response, next: NextFunction) {

  if (`${process.env.PRODUCTION}` == 'false') {
    return next();
  }

  await serviceInstance.isOk()
    .then((result: boolean) => {
      if (result) {
        next();
      } else {
        next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || Limited Nodes. Contact Administrator`));
      }
    })
    .catch((error: Error) => {
      next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    });
}
export default blockchain_status;
