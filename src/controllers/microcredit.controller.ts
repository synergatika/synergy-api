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
import accessMiddleware from '../middleware/access.middleware'
import customerMiddleware from '../middleware/customer.middleware'
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
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(EarnTokensDto), customerMiddleware, this.earnTokensByMerchant);
    this.router.post(`${this.path}/redeem/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationBodyMiddleware(RedeemTokensDto), customerMiddleware, this.campaignIdToCampaignAddress, this.redeemTokens, this.registerSpendFund);
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
      campaign: currentCampaign,
      support: currentSupport
    }
    next();
    // response.status(201).send({
    //   data: {
    //     support_id: currentSupport._id,
    //     backer_id: currentSupport.backer_id,
    //     amount: currentSupport.initialTokens,
    //     method: currentSupport.method,
    //     payment: currentSupport._id,
    //   },
    //   code: 201
    // });
  }

  private registerPromisedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //  address: '0xd54b47F8e6A1b97F3A84f63c867286272b273b7C',
    //    transactionHash: '0x28c69d2b1e9feffce47e60d5cfeef832640b28f4d6a05f7f3b13fc9a548da686',
    // promiseToFund(address _contributor, uint _amount)
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id; const data: EarnTokensDto = request.body;
    const user: User = request.user;
    const address: Campaign["address"] = response.locals.campaign.address;
    const support_id: Support["support_id"] = response.locals.support._id;

    await serviceInstance.getMicrocredit(address)
      .then((instance) => {
        return instance.promiseToFund(user.account.address, data._amount, serviceInstance.address)
          .then(async (result: any) => {
            console.log(result);
            console.log(support_id)
            console.log(result.logs[0].logIndex)

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
                  'microcredit.$.supports.$[d].contractIndex': result.logs[0].logIndex
                }
              }, { "arrayFilters": [{ "d._id": support_id }] });

            response.status(201).send({
              data: response.locals,
              code: 201
            });
            //    next();
          })
          .catch((error: Error) => {
            console.log("E1");
            console.log(error);

            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        console.log("E2");
        console.log(error);
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private earnTokensByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;
    const customer: User = response.locals.customer;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.supports': {
            'backer_id': customer._id,
            'initialTokens': data._amount,
            "redeemedTokens": 0,
            "method": data.method,
            "status": data.paid ? 'confirmation' : 'order'
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! Backer added €" + data._amount + " for token, for Campaign " + campaign_id + "!",
      code: 201
    });
  }

  private campaignIdToCampaignAddress = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match:
      {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        campaign_id: '$microcredit._id',
        address: '$microcredit.address',
      }
    }]).exec().catch());

    response.locals["campaign"] = campaigns[0];


    next();
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
    // response.status(200).send({
    //   message: "Success! Backer use " + Math.round(data._tokens) + " token, for Campaign " + campaign_id + "!",
    //   code: 200
    // });
  }

  private registerSpendFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //  spend(address _contributor, uint256 _price)
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const customer: User = response.locals.customer;
    const data: RedeemTokensDto = request.body;
    const address: Campaign["address"] = response.locals.campaign.address;

    console.log(address);
    console.log(customer);
    console.log(campaign_id);
    console.log(data);

    await serviceInstance.getMicrocredit(address)
      .then((instance) => {
        //return instance.methods['spend(address)'].sendTransaction(customer.account.address, serviceInstance.address)
        return instance.spend(customer.account.address, Math.round(data._tokens), serviceInstance.address)
          .then(async (result: any) => {
            console.log(result);

            await this.transaction.create({
              ...result,
              data: { user_id: customer._id, campaign_id: campaign_id, support_id: data.support_id }, type: 'SpendFund'
            });

            response.status(201).send({
              data: response.locals,
              code: 201
            });
            //    next();
          })
          .catch((error: Error) => {
            console.log("E1");
            console.log(error);

            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        console.log("E2");
        console.log(error);
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }
}

export default MicrocreditController;
