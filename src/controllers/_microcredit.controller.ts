import e, * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var path = require('path');

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);


/**
 * DTOs
 */
import PartnerID from '../usersDtos/partner_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import SupportID from '../microcreditDtos/support_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnTokensDto from '../microcreditDtos/earnTokens.dto';
import RedeemTokensDto from '../microcreditDtos/redeemTokens.dto';

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Partner from '../usersInterfaces/partner.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
import MicrocreditTransaction from '../microcreditInterfaces/transaction.interface';
import History from '../microcreditInterfaces/history.interface';
import Tokens from '../microcreditInterfaces/tokens.interface';
//import Payment from '../microcreditInterfaces/payment.interface';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import oneClickMiddleware from '../middleware/auth/one-click.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import usersMiddleware from '../middleware/items/users.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import checkMiddleware from '../middleware/items/check.middleware';
import balanceMiddleware from '../middleware/items/balance.middleware';
import convertHelper from '../middleware/items/convert.helper';
import OffsetHelper from '../middleware/items/offset.helper';
import blockchainStatus from '../middleware/items/status.middleware';

/**
 * Helper's Instance
 */
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.get(`${this.path}/one-click-balance/:partner_id/:campaign_id/:token`,
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,
      this.readBalance
    );

    this.router.get(`${this.path}/earn-tokens-balance/:partner_id/:campaign_id`,
      authMiddleware,
      validationParamsMiddleware(CampaignID),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,
      this.readBalance);

    this.router.post(`${this.path}/one-click/:partner_id/:campaign_id/:token`, blockchainStatus,
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,/*  this.readBackerTokens,*/ checkMiddleware.canEarnMicrocredit,
      this.earnTokens,
      this.registerPromisedFund, this.registerReceivedFund);

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id`, blockchainStatus,
      authMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,/*  this.readBackerTokens,*/ checkMiddleware.canEarnMicrocredit,
      this.earnTokens,
      this.registerPromisedFund, this.registerReceivedFund);

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id/:_to`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.member, usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,  /*  this.readBackerTokens, */checkMiddleware.canEarnMicrocredit,
      this.earnTokensByPartner,
      this.registerPromisedFund, this.registerReceivedFund);

    this.router.put(`${this.path}/confirm/:partner_id/:campaign_id/:support_id`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID),
      accessMiddleware.belongsTo,
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport,
      checkMiddleware.canConfirmRevertPayment,
      this.confirmSupportPayment,
      this.registerReceivedFund, this.registerRevertFund);

    this.router.post(`${this.path}/redeem/:partner_id/:campaign_id/:support_id`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID),
      accessMiddleware.belongsTo,
      validationBodyMiddleware(RedeemTokensDto),
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, usersMiddleware.member,
      checkMiddleware.canRedeemMicrocredit,
      this.redeemTokens,
      this.registerSpendFund);

    this.router.get(`${this.path}/badge`,
      authMiddleware,
      balanceMiddleware.microcredit_activity,
      this.readActivity);

    this.router.get(`${this.path}/transactions/:offset`,
      authMiddleware,
      this.readTransactions);
  }

  private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: response.locals.balance,
      code: 200
    });
  }

  private readActivity = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: response.locals.activity,
      code: 200
    });
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: partner_id,
      'microcredit._id': campaign_id
    }, {
      $push: {
        'microcredit.$.supports': {
          "backer_id": member._id,
          "initialTokens": data._amount,
          "method": data.method,
          "redeemedTokens": 0,
          "contractIndex": -1,
          "status": ((data.paid) ? 'confirmation' : 'order'),
          "createdAt": new Date(),
          "updatedAt": new Date()
        }
      }
    }, { new: true }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const currentCampaign = results.microcredit[results.microcredit.map(function (e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];
    currentSupport["support_id"] = currentSupport._id; currentSupport._id = undefined;
    response.locals["member"] = member;
    response.locals["support"] = currentSupport;

    next();
  }

  private earnTokensByPartner = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: partner_id,
      'microcredit._id': campaign_id
    }, {
      $push: {
        'microcredit.$.supports': {
          "backer_id": member._id,
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const currentCampaign = results.microcredit[results.microcredit.map(function (e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];
    currentSupport["support_id"] = currentSupport._id; currentSupport._id = undefined;
    response.locals["support"] = currentSupport;

    next();
  }

  private registerPromisedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;

    await serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
          .then(async (result: any) => {

            response.locals.support.contractIndex = result.logs[0].args.index;
            response.locals.support.contractRef = result.logs[0].args.ref;
            const payment_id = convertHelper.indexToPayment(response.locals.support.contractIndex);
            response.locals.support.payment_id = payment_id;

            await this.transaction.create({
              ...result,
              partner_id: partner_id, member_id: member._id,
              type: 'PromiseFund',
              data: {
                campaign_id: campaign_id, campaign_title: campaign.title, address: campaign.address,
                support_id: support.support_id, contractIndex: response.locals.support.contractIndex,
                tokens: data._amount
              }
            });

            await this.user.updateOne({
              _id: new ObjectId(partner_id),
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
              response.status(200).send({
                data: {
                  support_id: support.support_id,
                  payment_id: payment_id,
                  status: 'order',
                  method: data.method
                },
                code: 200
              });
            }
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
          })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
      })
  }

  private confirmSupportPayment = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: SupportID["partner_id"] = request.params.partner_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id;

    const support: Support = response.locals.support;

    let error: Error, results: any; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: partner_id,
      'microcredit._id': campaign_id,
      'microcredit.supports._id': support_id
    }, {
      $set: {
        'microcredit.$.supports.$[d].status': ((support.status === 'order') ? 'confirmation' : 'order')
      }
    }, { "arrayFilters": [{ "d._id": support_id }] }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    next();
  }

  private registerReceivedFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
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
                partner_id: partner_id, //member_id: support.backer_id,
                type: 'ReceiveFund',
                data: {
                  campaign_id: campaign_id, campaign_title: campaign.title, address: campaign.address,
                  support_id: support_id, contractIndex: support.contractIndex
                }
              });

              response.status(200).send({
                data: {
                  support_id: support.support_id,
                  payment_id: support.payment_id,
                  status: 'confirmation',
                  method: support.method,
                },
                code: 200
              });
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
        });
    } else {
      next();
    }
  }

  private registerRevertFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: SupportID["partner_id"] = request.params.partner_id;
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
              partner_id: partner_id,// member_id: support.backer_id,
              type: 'RevertFund',
              data: {
                campaign_id: campaign_id, campaign_title: campaign.title, address: campaign.address,
                support_id: support_id, contractIndex: support.contractIndex
              }
            });
            response.status(200).send({
              data: {
                support_id: support.support_id,
                payment_id: support.payment_id,
                status: 'order',
                method: support.method
              },
              code: 200
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
          })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
      })
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: SupportID["partner_id"] = request.params.partner_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id || request.body.support_id;

    const data: RedeemTokensDto = request.body;
    const _tokens = Math.round(data._tokens);

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: new ObjectId(partner_id),
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals.support.redeemedTokens += _tokens;
    next();
  }

  private registerSpendFund = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: SupportID["partner_id"] = request.params.partner_id;
    const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
    const support_id: SupportID["support_id"] = request.params.support_id;

    const data: RedeemTokensDto = request.body;
    const _tokens: number = Math.round(data._tokens);

    const member: User = response.locals.member;
    const campaign: Campaign = response.locals.campaign;

    if (campaign.quantitative) {
      await serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.spend(member.account.address, _tokens, serviceInstance.address)
            .then(async (result: any) => {

              await this.transaction.create({
                ...result,
                partner_id: partner_id, member_id: member._id,
                type: 'SpendFund',
                data: {
                  campaign_id: campaign_id, campaign_title: campaign.title, address: campaign.address,
                  support_id: support_id,
                  tokens: _tokens
                }
              });

              response.status(200).send({
                message: "Tokens spend",
                code: 200
              });
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
        })
    } else {
      await serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.methods['spend(address)'].sendTransaction(member.account.address, serviceInstance.address)
            .then(async (result: any) => {

              await this.transaction.create({
                ...result,
                partner_id: partner_id, member_id: member._id,
                type: 'SpendFund',
                data: {
                  campaign_id: campaign_id, campaign_title: campaign.title, address: campaign.address,
                  support_id: support_id,
                  tokens: _tokens
                }
              });

              response.status(200).send({
                message: "Tokens spend",
                code: 200
              });
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
        })
    }
  }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.transaction.find({
      $and: [
        { $or: [{ member_id: request.user._id }, { partner_id: request.user._id }] },
        { $or: [{ type: "PromiseFund" }, { type: "SpendFund" }, { type: "ReceiveFund" }, { type: "RevertFund" }] }
      ]
    }).select({
      "_id": 1, "type": 1,
      "member_id": 1, "partner_id": 1,
      "data": 1, "tx": 1,
      "createdAt": 1
    }).sort('-createdAt')
      .limit(offset.limit).skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: transactions,
      code: 200
    });
  }
}

export default MicrocreditController;
