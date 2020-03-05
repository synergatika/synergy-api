import e, * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import SupportID from '../microcreditDtos/support_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnTokensDto from '../microcreditDtos/earnTokens.dto';
import RedeemTokensDto from '../microcreditDtos/redeemTokens.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Merchant from '../usersInterfaces/merchant.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
//import Payment from '../microcreditInterfaces/payment.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import customerMiddleware from '../middleware/customer.middleware';
import merchantMiddleware from '../middleware/merchant.middleware';
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
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id`, authMiddleware, validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto), merchantMiddleware, itemsMiddleware.microcreditCampaign, this.earnTokens, this.registerPromisedFund);
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(EarnTokensDto), customerMiddleware, itemsMiddleware.microcreditCampaign, this.earnTokensByMerchant, this.registerPromisedFund, this.registerReceivedFund);
    this.router.put(`${this.path}/confirm/:merchant_id/:campaign_id/:support_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(SupportID), itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, this.confirmSupportPayment, this.registerReceivedFund, this.registerRevertFund);
    this.router.post(`${this.path}/redeem/:merchant_id/:campaign_id/:support_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(SupportID), validationBodyMiddleware(RedeemTokensDto), customerMiddleware, itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, this.redeemTokens, this.registerSpendFund);
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const customer: User = request.user;
    const merchant: Merchant = response.locals.merchant;
    const campaign: Campaign = response.locals.campaign;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if ((campaign.startsAt > seconds) || (campaign.expiresAt < seconds)) {
      return response.status(200).send({
        message: "Campaign is Not Available for Backing",
        code: 204
      });
    }

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
          "createdAt": new Date(),
          "updatedAt": new Date()
        }
      }
    }, { new: true }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    const currentCampaign = results.microcredit[results.microcredit.map(function (e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];
    currentSupport["support_id"] = currentSupport._id; currentSupport._id = undefined;
    response.locals["customer"] = customer;
    response.locals["merchant"] = merchant;
    response.locals["support"] = currentSupport;

    next();
  }

  private earnTokensByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const customer: User = response.locals.customer;
    const merchant: User = request.user;
    const campaign: Campaign = response.locals.campaign;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if ((campaign.startsAt > seconds) || (campaign.expiresAt < seconds)) {
      return response.status(200).send({
        message: "Sorry! No Backing Period",
        code: 204
      });
    }

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
      $push: {
        'microcredit.$.supports': {
          "backer_id": customer._id,
          "initialTokens": data._amount,
          "method": 'store',
          "redeemedTokens": 0,
          "contractIndex": -1,
          "status": ((data.paid) ? 'confirmation' : 'order'),
          "createdAt": new Date(),
          "updatedAt": new Date()
        }
      }
    }, { new: true }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    const currentCampaign = results.microcredit[results.microcredit.map(function (e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];
    currentSupport["support_id"] = currentSupport._id; currentSupport._id = undefined;
    response.locals["customer"] = customer;
    response.locals["merchant"] = merchant;
    response.locals["support"] = currentSupport;

    next();
  }

  //private randomGenerator = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

  //    const index: number = parseInt(request.params.index);
  private randomGenerator = (index: number) => {
    let payment_id: string;

    var _date = new Date();
    const _year = ("0" + _date.getFullYear()).slice(-2);
    const _day = ("0" + (_date.getMonth() + 1)).slice(-2);
    console.log(_year)
    console.log(_day)

    if ((index.toString()).length < 3) {
      payment_id = _year + _day + ("0" + index).slice(-2);
    } else if ((index.toString()).length < 5) {
      payment_id = _year + ("2" + index).slice(-4);
    } else if ((index.toString()).length < 7) {
      payment_id = ("1" + index).slice(-6);
    } else {
      payment_id = index.toString();
    }

    // response.status(201).send({
    //   message: payment_id,
    //   code: 201
    // });
    return payment_id;
  }

  private registerPromisedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const customer: User = response.locals.customer;
    const merchant: Merchant = response.locals.merchant;
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund(customer.account.address, data._amount, serviceInstance.address)
          .then(async (result: any) => {

            response.locals.support.contractIndex = result.logs[0].args.index;
            response.locals.support.contractRef = result.logs[0].args.ref;
            const payment_id = this.randomGenerator(response.locals.support.contractIndex);

            await this.transaction.create({
              ...result,
              merchant_id: merchant_id, customer_id: customer._id,
              data: {
                campaign_id: campaign_id, address: campaign.address,
                support_id: support.support_id, contractIndex: response.locals.support.contractIndex,
                tokens: data._amount
              }, type: 'PromiseFund'
            });

            await this.user.updateOne({
              _id: new ObjectId(merchant_id),
              'microcredit._id': new ObjectId(campaign_id),
              'microcredit.supports._id': new ObjectId(support.support_id),
            }, {
              $set: {
                'microcredit.$.supports.$[d].payment_id': payment_id,
                'microcredit.$.supports.$[d].contractIndex': response.locals.support.contractIndex,
                'microcredit.$.supports.$[d].contractRef': response.locals.support.contractRef,
                'microcredit.$.supports.$[d].updatedAt': new Date()
              }
            }, { "arrayFilters": [{ "d._id": support.support_id }] });

            if (data.paid) {
              next();
            } else {
              let how: string;
              if (data.method === 'nationalBank') {
                how = merchant.payments['nationalBank'];

              } else if (data.method === 'pireausBank') {
                how = merchant.payments['pireausBank'];

              } else if (data.method === 'eurobank') {
                how = merchant.payments['eurobank'];

              } else if (data.method === 'alphaBank') {
                how = merchant.payments['alphaBank'];

              } else if (data.method === 'paypal') {
                how = merchant.payments['paypal'];

              } else {
                how = 'Store';
              }
              response.status(201).send({
                data: {
                  support_id: support.support_id,
                  payment_id: payment_id,
                  method: data.method,
                  how: how
                },
                //message: "Success! A new Support has been added for Campaign: " + campaign_id + "! Status: 'Pending'! (Support ID: " + support.support_id + ")",
                code: 201
              });
            }
          })
          .catch((error: Error) => {
            console.log(error);
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        console.log(error);
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private confirmSupportPayment = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: SupportID["merchant_id"] = request.params.merchant_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id;

    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (((campaign.startsAt > seconds) || (campaign.expiresAt < seconds)) && (support.status === 'order')) {
      return response.status(200).send({
        message: "Sorry! No Payment Confirmation Period",
        code: 204
      });
    }
    if (((campaign.startsAt > seconds) || (campaign.redeemStarts < seconds)) && (support.status === 'confirmation')) {
      return response.status(200).send({
        message: "Sorry! No Revert Payment Period",
        code: 204
      });
    }

    let error: Error, results: any; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: merchant_id,
      'microcredit._id': campaign_id,
      'microcredit.supports._id': support_id
    }, {
      $set: {
        'microcredit.$.supports.$[d].status': ((support.status === 'order') ? 'confirmation' : 'order')
      }
    }, { "arrayFilters": [{ "d._id": support_id }] }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    next();
  }

  private registerReceivedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const campaign: Campaign = response.locals.campaign;
    const support_id: Support["support_id"] = response.locals.support.support_id || response.locals.support._id;
    const support: Support = response.locals.support;

    if ((data && data.paid) || support.status === 'order') {
      await serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.fundReceived(support.contractIndex, serviceInstance.address)
            .then(async (result: any) => {
              await this.transaction.create({
                ...result,
                merchant_id: merchant_id, customer_id: support.backer_id,
                data: {
                  campaign_id: campaign_id, address: campaign.address,
                  support_id: support_id, contractIndex: support.contractIndex
                }, type: 'ReceiveFund'
              });

              response.status(201).send({
                message: "Success! Support with ID: " + support_id + " has been updated to Status: Paid!",
                code: 201
              });
            })
            .catch((error: Error) => {
              console.log(error);
              next(new UnprocessableEntityException('Blockchain Error'))
            })
        })
        .catch((error: Error) => {
          console.log(error);
          next(new UnprocessableEntityException('Blockchain Error'))
        });
    } else {
      next();
    }
  }

  private registerRevertFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: SupportID["merchant_id"] = request.params.merchant_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: Support["support_id"] = request.params.support_id;
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.revertFund(support.contractIndex, serviceInstance.address)
          .then(async (result: any) => {
            await this.transaction.create({
              ...result,
              merchant_id: merchant_id, customer_id: support.backer_id,
              data: {
                campaign_id: campaign_id, address: campaign.address,
                support_id: support_id, contractIndex: support.contractIndex
              }, type: 'RevertFund'
            });
            response.status(201).send({
              message: "Success! Support with ID: " + support_id + " has been updated to Status: Unpaid!",
              code: 200
            });
          })
          .catch((error: Error) => {
            console.log(error);
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error: Error) => {
        console.log(error);
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: SupportID["merchant_id"] = request.params.merchant_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id || request.body.support_id;

    const data: RedeemTokensDto = request.body;
    const _tokens = Math.round(data._tokens);

    const campaign = response.locals.campaign;
    const support = response.locals.support;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (((campaign.redeemStarts > seconds) || (campaign.redeemEnds < seconds)) && (support.status === 'order')) {
      return response.status(200).send({
        message: "Sorry! No Redeem Period",
        code: 204
      });
    }
    if (support.initialTokens < ((support.redeemTokens) + _tokens)) {
      return response.status(200).send({
        message: "Sorry! Not Enough Tokens",
        code: 204
      });
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: new ObjectId(merchant_id),
      'microcredit._id': new ObjectId(campaign_id),
      'microcredit.supports._id': support_id
    }, {
      $inc: {
        'microcredit.$.supports.$[d].redeemedTokens': _tokens
      },
      $set: {
        'microcredit.$.supports.$[d].updatedAt': new Date()
      }
    }, { "arrayFilters": [{ "d._id": support_id }] }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    next();
  }

  private registerSpendFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: SupportID["merchant_id"] = request.params.merchant_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id || request.body.support_id;

    const data: RedeemTokensDto = request.body;
    const _tokens: number = Math.round(data._tokens);

    const customer: User = response.locals.customer;
    const campaign: Campaign = response.locals.campaign;

    if (campaign.quantitative) {
      await serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.spend(customer.account.address, _tokens, serviceInstance.address)
            .then(async (result: any) => {

              await this.transaction.create({
                ...result,
                merchant_id: merchant_id, customer_id: customer._id,
                data: {
                  campaign_id: campaign_id, address: campaign.address,
                  support_id: support_id,
                  tokens: _tokens
                }, type: 'SpendFund'
              });

              response.status(201).send({
                data: response.locals,
                code: 201
              });
            })
            .catch((error: Error) => {
              console.log(error)
              next(new UnprocessableEntityException('Blockchain Error'))
            })
        })
        .catch((error: Error) => {
          console.log(error)
          next(new UnprocessableEntityException('Blockchain Error'))
        })
    } else {
      await serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.methods['spend(address)'].sendTransaction(customer.account.address, serviceInstance.address)
            .then(async (result: any) => {

              await this.transaction.create({
                ...result,
                merchant_id: merchant_id, customer_id: customer._id,
                data: {
                  campaign_id: campaign_id, address: campaign.address,
                  support_id: support_id,
                  tokens: _tokens
                }, type: 'SpendFund'
              });

              response.status(201).send({
                data: response.locals,
                code: 201
              });
            })
            .catch((error: Error) => {
              console.log(error)
              next(new UnprocessableEntityException('Blockchain Error'))
            })
        })
        .catch((error: Error) => {
          console.log(error)
          next(new UnprocessableEntityException('Blockchain Error'))
        })
    }
  }
}

export default MicrocreditController;
