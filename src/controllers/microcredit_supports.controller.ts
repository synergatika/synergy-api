import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

// Dtos
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import PaymentDto from '../microcreditDtos/payment.params.dto';
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
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import customerMiddleware from '../middleware/customer.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';

// Path
var path = require('path');

// Blockchain Service
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

class MicrocreditSupportsController implements Controller {
  public path = '/microcredit/supports';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/`, authMiddleware, this.readAllBackerSupports);
    this.router.get(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), this.readAllSupportsByCampaign);
    this.router.get(`${this.path}/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readBackerSupportsByCampaign);
    this.router.put(`${this.path}/:merchant_id/:campaign_id/:payment`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(PaymentDto), this.confirmSupportPayment, this.campaignIdToCampaignAddress, this.paymentToSupports, this.registerReceivedFund);
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        'microcredit.supports.backer_id': (user._id).toString()
      }
    }, {
      $project: {
        _id: false,
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readAllSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }]
      }
    }, {
      $project: {
        _id: false,
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readBackerSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const customer: User = response.locals.customer;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }, {
          'microcredit.supports.backer_id': (customer._id).toString()
        }]
      }
    }, {
      $project: {
        _id: false,
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private confirmSupportPayment = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const status: string = (request.params.payment === 'pay') ? 'confirmation' : 'order';
    const payment_id: string[] = request.body.payment_id;

    let error: Error, results: any; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: merchant_id,
      'microcredit._id': campaign_id,
      'microcredit.supports._id': { $in: payment_id }
    }, {
        $set: {
          'microcredit.$.supports.$[d].status': status
        }
      }, { "arrayFilters": [{ "d._id": { $in: payment_id } }] }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    // response.status(200).send({
    //   message: (results['nModified']) ? "Success! Campaign with Id:" + campaign_id + " has been updated to Status:" + status + " for Payments:" + payment_id + "!" : "Nothing to Update",
    //   code: 200
    // });
    next();
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

    response.locals = {
      campaign: campaigns[0]
    };

    next();
  }

  private paymentToSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const payment_id: string[] = request.body.payment_id;

    console.log(payment_id);

    let payments: any = [];
    payment_id.forEach(p => {
      payments.push(new ObjectId(p));
    });

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }, {
          'microcredit.supports._id': { $in: payments }
        }]
      }
    }, {
      $project: {
        _id: false,
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
        contractIndex: '$microcredit.supports.contractIndex',
      }
    }, {
      $sort: {
        support_id: -1
      }
    }
    ]).exec().catch());

    response.locals["supports"] = supports;
    console.log(response.locals.supports);

    next();
  }

  private registerReceivedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const campaign: Campaign = response.locals.campaign;
    const supports: Support[] = response.locals.supports;
    const status: boolean = (request.params.payment === 'pay');

    console.log('Status: ' + status);
    console.log('Supports: ' + supports);

    if (status) {
      supports.forEach(async (s, index) => {
        console.log("S: " + status);
        console.log("Supp: " + s);
        console.log("I: " + index);


        await serviceInstance.getMicrocredit(campaign.address)
          .then((instance) => {
            return instance.fundReceived(0, serviceInstance.address)
              .then(async (result: any) => {
                await this.transaction.create({
                  ...result,
                  data: { user_id: s.backer_id, campaign_id: campaign.campaign_id, support_id: s.support_id },
                  type: 'ReceiveFund'
                });
                if (index === (supports.length - 1)) {
                  response.status(201).send({
                    data: "Success! Campaign with Id:" + campaign.campaign_id + " has been updated to Status:" + status + " for " + supports.length + " Payments!",
                    code: 200
                  });
                }
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
      });
    } else {
      response.status(201).send({
        data: "Success! Campaign with Id:" + campaign.campaign_id + " has been updated to Status:" + status + " for 0 Payments!",
        code: 200
      });  //supports.length = 0;
    }

  }
}

export default MicrocreditSupportsController;
