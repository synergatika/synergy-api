import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnTokensDto from '../microcreditDtos/earnTokens.dto';
import RedeemTokensDto from '../microcreditDtos/redeemTokens.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import customerMiddleware from '../middleware/customer.middleware';
import itemsMiddleware from '../middleware/items.middleware';
// Models
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';

// Path
var path = require('path');

// Blockchain Service
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id`, authMiddleware, validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto), this.earnTokens, this.registerPromisedFund);
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(EarnTokensDto), customerMiddleware, this.earnTokensByMerchant, this.registerPromisedFund, this.registerReceivedFund);
    this.router.post(`${this.path}/redeem/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationBodyMiddleware(RedeemTokensDto), customerMiddleware, itemsMiddleware.microcreditCampaign, this.redeemTokens, this.registerSpendFund);
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;
    const user: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.supports': {
            "backer_id": user._id,
            "initialTokens": data._amount,
            "method": data.method,
            "redeemedTokens": 0,
            "contractIndex": -1
          }
        }
      }, { new: true }).catch());

    const currentCampaign = results.microcredit[results.microcredit.map(function(e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.locals = {
      user: user,
      campaign: currentCampaign,
      support: currentSupport
    }
    next();
  }

  private earnTokensByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const customer: User = response.locals.customer;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.supports': {
            "backer_id": customer._id,
            "initialTokens": data._amount,
            "method": data.method,
            "redeemedTokens": 0,
            "contractIndex": -1,
            "status": data.paid ? 'confirmation' : 'order'
          }
        }
      }, { new: true }).catch());

    const currentCampaign = results.microcredit[results.microcredit.map(function(e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.locals = {
      user: customer,
      campaign: currentCampaign,
      support: currentSupport
    }
    next();
  }

  private registerPromisedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const user: User = response.locals.user;
    const campaign: Campaign = response.locals.campaign;
    const support_id: Support['support_id'] = response.locals.support._id;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund(user.account.address, data._amount, serviceInstance.address)
          .then(async (result: any) => {

            await this.transaction.create({
              ...result,
              data: { user_id: user._id, campaign_id: campaign_id, support_id: support_id }, type: 'PromiseFund'
            });

            await this.user.updateOne({
              _id: new ObjectId(merchant_id),
              'microcredit._id': new ObjectId(campaign_id),
              'microcredit.supports._id': support_id,
            }, {
                $set: {
                  'microcredit.$.supports.$[d].contractIndex': result.logs[0].args.index,
                  'microcredit.$.supports.$[d].contractRef': result.logs[0].args.ref
                }
              }, { "arrayFilters": [{ "d._id": support_id }] });


            response.locals.support.contractIndex = result.logs[0].args.index;

            if (data.paid) {
              next();
            } else {
              response.status(201).send({
                data: response.locals,
                code: 201
              });
            }
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private registerReceivedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const user: User = response.locals.user;
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;
    const support_id: Support['support_id'] = response.locals.support._id;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.fundReceived(support.contractIndex, serviceInstance.address)
          .then(async (result: any) => {
            await this.transaction.create({
              ...result,
              data: { user_id: user._id, campaign_id: campaign.campaign_id, support_id: support_id },
              type: 'ReceiveFund'
            });

            response.status(201).send({
              data: "Success! Campaign with Id:" + campaign.campaign_id + " has been updated to Status:" + status + " for 0 Payments!",
              code: 200

            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      });
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: RedeemTokensDto = request.body;

    const customer: User = response.locals.customer;

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: new ObjectId(merchant_id),
      'microcredit._id': new ObjectId(campaign_id),
      'microcredit.supports._id': data.support_id,
      // 'microcredit.supports.status': 'confirmation',
      // 'microcredit.supports.backer_id': (customer._id).toString()
    }, {
        $inc: {
          'microcredit.$.supports.$[d].redeemedTokens': Math.round(data._tokens)
        }
      }, { "arrayFilters": [{ "d._id": data.support_id }] }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    next();
  }

  private registerSpendFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: RedeemTokensDto = request.body;

    const customer: User = response.locals.customer;
    const campaign: Campaign = response.locals.campaign;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        //return instance.methods['spend(address)'].sendTransaction(customer.account.address, serviceInstance.address)
        return instance.spend(customer.account.address, Math.round(data._tokens), serviceInstance.address)
          .then(async (result: any) => {

            await this.transaction.create({
              ...result,
              data: { user_id: customer._id, campaign_id: campaign_id, support_id: data.support_id }, type: 'SpendFund'
            });

            response.status(201).send({
              data: response.locals,
              code: 201
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }
}

export default MicrocreditController;
