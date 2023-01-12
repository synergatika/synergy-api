

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
 * Email Service
 */
import EmailService from '../utils/emailService';
const emailService = new EmailService();

/**
 * DTOs
 */
import { IdentifierToDto, EarnTokensDto, RedeemTokensDto, CampaignID, SupportID } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, Partner, PartnerPayment, MicrocreditCampaign, MicrocreditSupport, MicrocreditTransaction, SupportStatus, TransactionStatus, Member, SupportPayment } from '../_interfaces/index';

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
import microcreditSupport from '../models/support.model';
import failedTransactionModel from '../models/failed.transaction.model';
import { assign } from 'nodemailer/lib/shared';
import supportModel from '../models/support.model';
import { email } from 'envalid';

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;
  private microcreditSupport = microcreditSupport;
  private failedTransaction = failedTransactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.get(`${this.path}/one-click-balance/:partner_id/:campaign_id/:token`,
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID),
      usersMiddleware.partner, usersMiddleware.member, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,
      this.readBalance
    );

    // this.router.get(`${this.path}/earn-tokens-balance/:partner_id/:campaign_id`,
    //   authMiddleware,
    //   validationParamsMiddleware(CampaignID),
    //   usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
    //   balanceMiddleware.microcredit_balance,
    //   this.readBalance);

    this.router.post(`${this.path}/one-click/:partner_id/:campaign_id/:token`, /*blockchainStatus,*/
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, usersMiddleware.member, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,/*  this.readBackerTokens,*/
      checkMiddleware.canEarnMicrocredit,
      this.oneClickEarnTokens,
      // this.registerPromisedFund, this.registerReceivedFund,
      // emailService.newSupportPartner, emailService.newSupportMember
    );

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id`,/* blockchainStatus,*/
      authMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      usersMiddleware.member,
      balanceMiddleware.microcredit_balance,/*  this.readBackerTokens,*/
      checkMiddleware.canEarnMicrocredit,
      this.autoEarnTokens,
      // this.registerPromisedFund, this.registerReceivedFund,
      // emailService.newSupportPartner, emailService.newSupportMember
    );

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id/:_to`, /*blockchainStatus,*/
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, usersMiddleware.partner,
      validationBodyMiddleware(EarnTokensDto), itemsMiddleware.microcreditCampaign,
      validationParamsMiddleware(IdentifierToDto), usersMiddleware.member,
      balanceMiddleware.microcredit_balance,  /*  this.readBackerTokens, */
      checkMiddleware.canEarnMicrocredit,
      this.earnTokens,
      // this.registerPromisedFund, this.registerReceivedFund,
      // emailService.newSupportPartner, emailService.newSupportMember
    );

    this.router.put(`${this.path}/confirm/:partner_id/:campaign_id/:support_id`, /*blockchainStatus,*/
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID), accessMiddleware.belongsTo,
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, usersMiddleware.member,
      checkMiddleware.canConfirmRevertPayment,
      this.confirmTokens,
      // this.registerReceivedFund, this.registerRevertFund,
      // emailService.changeSupportStatus
    );

    this.router.post(`${this.path}/redeem/:partner_id/:campaign_id/:support_id`,/* blockchainStatus,*/
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID), accessMiddleware.belongsTo,
      validationBodyMiddleware(RedeemTokensDto),
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, usersMiddleware.member,
      checkMiddleware.canRedeemMicrocredit,
      this.redeemTokens,
      // this.registerSpendFund,
      // emailService.redeemSupport
    );

    this.router.get(`${this.path}/badge`,
      authMiddleware,
      balanceMiddleware.microcredit_activity,
      this.readActivity);

    this.router.get(`${this.path}/transactions/:offset`,
      authMiddleware,
      this.readTransactions);
  }

  private formatDate(date: Date): string {
    var d: Date = new Date(date),
      month: string = ('0' + (d.getMonth() + 1)).slice(-2),
      day: string = ('0' + d.getDate()).slice(-2),
      year: string = (d.getFullYear()).toString();

    return [year, month, day].join('-');
  }

  /** NEW */
  private isError = (err: unknown): err is Error => err instanceof Error;


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

  private escapeBlockchainError = async (_error: any, _type: string) => {
    await this.failedTransaction.create({
      error: _error,
      type: _type
    })
  }

  private oneClickEarnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    const _support_id = new ObjectId();
    const _payment: SupportPayment = {
      _id: convertHelper.indexToPayment(
        ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
          return this.formatDate(o.createdAt) == this.formatDate(new Date())
        })).length),
      method: (data.method == 'store') ?
        {
          bic: 'store',
          name: 'Store',
          value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
        } : ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0])
    };


    let blockchain_result: any | Error;
    blockchain_result = await this.registerPromisedFund(campaign, member, data, _support_id);
    if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: blockchain_result.logs[0].args.ref,
      contractIndex: blockchain_result.logs[0].args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      blockchain_result = await this.registerReceivedFund(campaign, created_support);
      if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));
    }

    let email_result_partner = await emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data)
    if (this.isError(email_result_partner)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_partner}`));

    let email_result_member = await emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data)
    if (this.isError(email_result_member)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_member}`));


    response.status(200).send({
      data: {
        support_id: created_support._id,
        payment_id: created_support.payment._id,
        status: created_support.status,
        method: created_support.payment.method,
      },
      code: 200
    });
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    const _support_id = new ObjectId();
    const _payment: SupportPayment = {
      _id: convertHelper.indexToPayment(
        ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
          return this.formatDate(o.createdAt) == this.formatDate(new Date())
        })).length),
      method: (data.method == 'store') ?
        {
          bic: 'store',
          name: 'Store',
          value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
        } : ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0])
    };

    let blockchain_result: any | Error;
    blockchain_result = await this.registerPromisedFund(campaign, member, data, _support_id);
    if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: blockchain_result.logs[0].args.ref,
      contractIndex: blockchain_result.logs[0].args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      blockchain_result = await this.registerReceivedFund(campaign, created_support);
      if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));
    }

    let email_result_partner = await emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data)
    if (this.isError(email_result_partner)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_partner}`));

    let email_result_member = await emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data)
    if (this.isError(email_result_member)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_member}`));


    response.status(200).send({
      data: {
        support_id: created_support._id,
        payment_id: created_support.payment._id,
        status: created_support.status,
        method: created_support.payment.method,
      },
      code: 200
    });
  }

  private autoEarnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    const _support_id = new ObjectId();
    const _payment: SupportPayment = {
      _id: convertHelper.indexToPayment(
        ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
          return this.formatDate(o.createdAt) == this.formatDate(new Date())
        })).length),
      method: (data.method == 'store') ?
        {
          bic: 'store',
          name: 'Store',
          value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
        } : ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0])
    };

    let blockchain_result: any | Error;
    blockchain_result = await this.registerPromisedFund(campaign, member, data, _support_id);
    if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: blockchain_result.logs[0].args.ref,
      contractIndex: blockchain_result.logs[0].args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      blockchain_result = await this.registerReceivedFund(campaign, created_support);
      if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));
    }

    let email_result_partner = await emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data)
    if (this.isError(email_result_partner)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_partner}`));

    let email_result_member = await emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data)
    if (this.isError(email_result_member)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_member}`));


    response.status(200).send({
      data: {
        support_id: created_support._id,
        payment_id: created_support.payment._id,
        status: created_support.status,
        method: created_support.payment.method,
      },
      code: 200
    });
  }

  private confirmTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const campaign: MicrocreditCampaign = response.locals.campaign;
    const support: MicrocreditSupport = response.locals.support;
    console.log("previous_support");
    console.log(support);
    let error: Error, updated_support: MicrocreditSupport;
    [error, updated_support] = await to(this.microcreditSupport.findOneAndUpdate(
      {
        _id: support._id
      }, {
      $set: {
        currentTokens: (support.status == SupportStatus.UNPAID) ? support.initialTokens : 0,
        status: (support.status == SupportStatus.UNPAID) ? SupportStatus.PAID : SupportStatus.UNPAID
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (support.status != SupportStatus.PAID) {
      let blockchain_result: any | Error;
      blockchain_result = await this.registerRevertFund(campaign, support);
      if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));
    } else {
      let blockchain_result: any | Error;
      blockchain_result = await this.registerReceivedFund(campaign, support);
      if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));
    }
    console.log("updated_support");
    console.log(updated_support);

    let email_result_member = await emailService.changeSupportStatus(request.headers['content-language'], (support.member as Member).email, support)
    if (this.isError(email_result_member)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_member}`));

    response.status(200).send({
      data: {
        support_id: support._id,
        payment_id: support.payment._id,
        status: updated_support.status,
        method: support.payment.method,
      },
      code: 200
    });
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RedeemTokensDto = request.body;

    const member: Member = response.locals.member;
    const campaign: MicrocreditCampaign = response.locals.campaign;
    const support: MicrocreditSupport = response.locals.support;

    let blockchain_result: any | Error;
    blockchain_result = await this.registerSpentFund(campaign, member, data, support);
    if (this.isError(blockchain_result)) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${blockchain_result}`));

    let error: Error, updated_support: MicrocreditSupport;
    [error, updated_support] = await to(this.microcreditSupport.findOneAndUpdate({
      _id: support._id
    }, {
      $set: {
        currentTokens: support.initialTokens - data._tokens,
        status: ((support.status == SupportStatus.PAID) && (support.initialTokens - data._tokens <= 0)) ? SupportStatus.COMPLETED : SupportStatus.PAID
      }
    }).catch());

    let email_result_member = await emailService.redeemSupport(request.headers['content-language'], member.email, campaign, support, data)
    if (this.isError(email_result_member)) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_result_member}`));

    response.status(200).send({
      message: 'Tokens Spent',
      code: 200
    });
  }

  private registerPromisedFund = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto, support_id: MicrocreditSupport['_id']) => {
    let error: Error, result: any;
    [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
    if (error) {
      this.escapeBlockchainError(error, "PromiseFund")
      return error;
    }

    await this.transaction.create({
      support: support_id,
      ...result,
      tokens: data._amount,
      type: 'PromiseFund',
      status: (error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
      // ...response.locals.support,
    });

    return result;
  }

  // private registerPromisedFund2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   const partner_id: CampaignID["partner_id"] = request.params.partner_id;
  //   const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
  //   const data: EarnTokensDto = request.body;

  //   const member: User = response.locals.member;
  //   const partner: Partner = response.locals.partner;
  //   const campaign: MicrocreditCampaign = response.locals.campaign;
  //   //const support: Support = response.locals.support;

  //   // const contractIndex = (await this.transaction.find({ partner_id: partner_id, type: 'PromiseFund' })).length;
  //   // const payment_id = convertHelper.indexToPayment(
  //   //   ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
  //   //     return this.formatDate(o.createdAt) == this.formatDate(new Date())
  //   //   })
  //   //   ).length);

  //   let error: Error, result: any;
  //   [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  //   if (error) {
  //     this.escapeBlockchainError(error, "PromiseFund")
  //     return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //   }


  //   response.locals['support'] = {
  //     support_id: new ObjectId(),
  //     partner_id: partner_id,
  //     partner_name: partner.name,

  //     member_id: member._id,

  //     campaign_id: campaign_id,
  //     campaign_title: campaign.title,
  //     address: campaign.address,
  //     method: data.method,
  //     payment_id: convertHelper.indexToPayment(
  //       ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
  //         return this.formatDate(o.createdAt) == this.formatDate(new Date())
  //       })).length),
  //     tokens: data._amount,
  //     contractRef: result.logs[0].args.ref,
  //     contractIndex: result.logs[0].args.index,
  //     type: 'PromiseFund',
  //   }

  //   await this.transaction.create({
  //     ...result,
  //     ...response.locals.support,
  //     type: 'PromiseFund'
  //   });

  //   if (data.method != 'store') {
  //     response.locals['extras'] = {
  //       method: ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0]),
  //       tokens: data._amount,
  //       paid: data.paid
  //     }
  //   } else {
  //     response.locals['extras'] = {
  //       method: {
  //         bic: 'store',
  //         name: 'Store',
  //         value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
  //       },
  //       tokens: data._amount,
  //       paid: data.paid
  //     }
  //   }

  //   response.locals.support = {
  //     ...response.locals['support'],
  //     status: 'unpaid'
  //   }

  //   next();


  //   // await serviceInstance.getMicrocredit(campaign.address)
  //   //   .then((instance) => {
  //   //     return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
  //   //       .then(async (result: any) => {

  //   //         response.locals['support'] = {
  //   //           support_id: new ObjectId(),
  //   //           partner_id: partner_id,
  //   //           partner_name: partner.name,

  //   //           member_id: member._id,

  //   //           campaign_id: campaign_id,
  //   //           campaign_title: campaign.title,
  //   //           address: campaign.address,
  //   //           method: data.method,
  //   //           payment_id: convertHelper.indexToPayment(
  //   //             ((await this.transaction.find({ type: 'PromiseFund' })).filter((o: MicrocreditTransaction) => {
  //   //               return this.formatDate(o.createdAt) == this.formatDate(new Date())
  //   //             })).length),
  //   //           tokens: data._amount,
  //   //           contractRef: result.logs[0].args.ref,
  //   //           contractIndex: result.logs[0].args.index,
  //   //           type: 'PromiseFund',
  //   //         }

  //   //         await this.transaction.create({
  //   //           ...result,
  //   //           ...response.locals.support,
  //   //           type: 'PromiseFund'
  //   //         });

  //   //         if (data.method != 'store') {
  //   //           response.locals['extras'] = {
  //   //             method: ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0]),
  //   //             tokens: data._amount,
  //   //             paid: data.paid
  //   //           }
  //   //         } else {
  //   //           response.locals['extras'] = {
  //   //             method: {
  //   //               bic: 'store',
  //   //               name: 'Store',
  //   //               value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
  //   //             },
  //   //             tokens: data._amount,
  //   //             paid: data.paid
  //   //           }
  //   //         }

  //   //         response.locals.support = {
  //   //           ...response.locals['support'],
  //   //           status: 'unpaid'
  //   //         }

  //   //         next();
  //   //         // if (data.paid) {
  //   //         //   next();
  //   //         // } else {
  //   //         //   response.status(200).send({
  //   //         //     data: {
  //   //         //       support_id: response.locals['support'].support_id,
  //   //         //       payment_id: response.locals['support'].payment_id,
  //   //         //       status: 'unpaid',
  //   //         //       method: data.method
  //   //         //     },
  //   //         //     code: 200
  //   //         //   });
  //   //         // }
  //   //       })
  //   //       .catch((error: Error) => {
  //   //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //       })
  //   //   })
  //   //   .catch((error: Error) => {
  //   //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //   })
  // }

  private registerReceivedFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    let error: Error, result: any;
    [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.fundReceived(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
    if (error) {
      this.escapeBlockchainError(error, "ReceiveFund")
      return error;
    }

    await this.transaction.create({
      support: support._id,
      ...result,
      type: 'ReceiveFund',
      status: (error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
    });
  }

  // private registerReceivedFund2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   //const partner_id: CampaignID["partner_id"] = request.params.partner_id;
  //   //const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
  //   //const support_id: Support["support_id"] = response.locals.support.support_id || response.locals.support._id;
  //   const data: EarnTokensDto = request.body;

  //   const campaign: MicrocreditCampaign = response.locals.campaign;
  //   const support: MicrocreditSupport = response.locals.support;

  //   if (((Object.keys(data).length > 0) && !data.paid) || ((support.type == 'ReceiveFund') || (support.type == 'SpendFund'))) {
  //     return next();
  //   }

  //   let error: Error, result: any;
  //   [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.fundReceived(support.contractIndex, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  //   if (error) {
  //     this.escapeBlockchainError(error, "ReceiveFund")
  //     return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //   }

  //   await this.transaction.create({
  //     ...result,
  //     ...support,
  //     type: 'ReceiveFund',
  //     tokens: 0,
  //     payoff: support.initialTokens
  //   });

  //   response.locals.support = {
  //     ...support,
  //     status: 'paid'
  //   }
  //   // response.status(200).send({
  //   //   data: {
  //   //     support_id: support.support_id,
  //   //     payment_id: support.payment_id,
  //   //     status: 'paid',
  //   //     method: support.method,
  //   //   },
  //   //   code: 200
  //   // });

  //   next();

  //   // await serviceInstance.getMicrocredit(campaign.address)
  //   //   .then((instance) => {
  //   //     return instance.fundReceived(support.contractIndex, serviceInstance.address)
  //   //       .then(async (result: any) => {
  //   //         await this.transaction.create({
  //   //           ...result,
  //   //           ...support,
  //   //           type: 'ReceiveFund',
  //   //           tokens: 0,
  //   //           payoff: support.initialTokens
  //   //         });

  //   //         response.locals.support = {
  //   //           ...support,
  //   //           status: 'paid'
  //   //         }
  //   //         // response.status(200).send({
  //   //         //   data: {
  //   //         //     support_id: support.support_id,
  //   //         //     payment_id: support.payment_id,
  //   //         //     status: 'paid',
  //   //         //     method: support.method,
  //   //         //   },
  //   //         //   code: 200
  //   //         // });

  //   //         next();
  //   //       })
  //   //       .catch((error: Error) => {
  //   //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //       })
  //   //   })
  //   //   .catch((error: Error) => {
  //   //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //   });
  // }

  private registerRevertFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    let error: Error, result: any;
    [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.revertFund(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
    if (error) {
      this.escapeBlockchainError(error, "RevertFund")
      return error;
    }

    await this.transaction.create({
      support: support._id,
      ...result,
      type: 'RevertFund',
      status: (error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
    });
  }

  // private registerRevertFund2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   // const partner_id: SupportID["partner_id"] = request.params.partner_id;
  //   // const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  //   // const support_id: Support["support_id"] = request.params.support_id;
  //   const campaign: MicrocreditCampaign = response.locals.campaign;
  //   const support: MicrocreditSupport = response.locals.support;

  //   if ((support.type == 'PromiseFund') || (support.type == 'RevertFund')) {
  //     return next();
  //   };

  //   let error: Error, result: any;
  //   [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.revertFund(support.contractIndex, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  //   if (error) {
  //     this.escapeBlockchainError(error, "RevertFund")
  //     return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //   }

  //   await this.transaction.create({
  //     ...result,
  //     ...support,
  //     type: 'RevertFund',
  //     tokens: 0,
  //     payoff: support.initialTokens * (-1)
  //   });

  //   response.locals.support = {
  //     ...support,
  //     type: 'RevertFund',
  //     status: 'unpaid'
  //   }
  //   next();

  //   // await serviceInstance.getMicrocredit(campaign.address)
  //   //   .then((instance) => {
  //   //     return instance.revertFund(support.contractIndex, serviceInstance.address)
  //   //       .then(async (result: any) => {
  //   //         await this.transaction.create({
  //   //           ...result,
  //   //           ...support,
  //   //           type: 'RevertFund',
  //   //           tokens: 0,
  //   //           payoff: support.initialTokens * (-1)
  //   //         });

  //   //         response.locals.support = {
  //   //           ...support,
  //   //           type: 'RevertFund',
  //   //           status: 'unpaid'
  //   //         }
  //   //         next();
  //   //         // response.status(200).send({
  //   //         //   data: {
  //   //         //     support_id: support.support_id,
  //   //         //     payment_id: support.payment_id,
  //   //         //     status: 'unpaid',
  //   //         //     method: support.method
  //   //         //   },
  //   //         //   code: 200
  //   //         // });
  //   //       })
  //   //       .catch((error: Error) => {
  //   //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //       })
  //   //   })
  //   //   .catch((error: Error) => {
  //   //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   //   })
  // }

  private registerSpentFund = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto, support: MicrocreditSupport) => {
    if (campaign.quantitative) {
      let error: Error, result: any;
      [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.spend('0x' + member.account.address, data._tokens, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
      );
      if (error) {
        this.escapeBlockchainError(error, "SpendFund")
        return error;
      }

      await this.transaction.create({
        support: support._id,
        ...result,
        tokens: data._tokens,
        type: 'SpendFund',
        status: (error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
      });
    } else {
      let error: Error, result: any;
      [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
      );
      if (error) {
        this.escapeBlockchainError(error, "SpendFund")
        return error;
      }

      await this.transaction.create({
        support: support._id,
        ...result,
        tokens: data._tokens,
        type: 'SpendFund',
        status: (error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
      });
    }
  }

  // private registerSpendFund2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   // const partner_id: SupportID["partner_id"] = request.params.partner_id;
  //   // const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  //   // const support_id: SupportID["support_id"] = request.params.support_id;

  //   const data: RedeemTokensDto = request.body;
  //   const _tokens: number = Math.round(data._tokens);

  //   const member: User = response.locals.member;
  //   const campaign: MicrocreditCampaign = response.locals.campaign;
  //   const support: MicrocreditSupport = response.locals.support;

  //   if (campaign.quantitative) {
  //     let error: Error, result: any;
  //     [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
  //       .then((instance) => {
  //         return instance.spend('0x' + member.account.address, _tokens, serviceInstance.address)
  //       })
  //       .catch((error) => {
  //         return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //       })
  //     );
  //     if (error) {
  //       this.escapeBlockchainError(error, "SpendFund")
  //       return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     }

  //     await this.transaction.create({
  //       ...result,
  //       ...support,
  //       type: 'SpendFund',
  //       tokens: _tokens * (-1)
  //     });

  //     response.locals['extras'] = {
  //       tokens: _tokens,
  //     };
  //     // response.status(200).send({
  //     //   message: "Tokens spend",
  //     //   code: 200
  //     // });
  //     next();


  //     // await serviceInstance.getMicrocredit(campaign.address)
  //     //   .then((instance) => {
  //     //     return instance.spend('0x' + member.account.address, _tokens, serviceInstance.address)
  //     //       .then(async (result: any) => {
  //     //         await this.transaction.create({
  //     //           ...result,
  //     //           ...support,
  //     //           type: 'SpendFund',
  //     //           tokens: _tokens * (-1)
  //     //         });

  //     //         response.locals['extras'] = {
  //     //           tokens: _tokens,
  //     //         };
  //     //         // response.status(200).send({
  //     //         //   message: "Tokens spend",
  //     //         //   code: 200
  //     //         // });
  //     //         next();
  //     //       })
  //     //       .catch((error: Error) => {
  //     //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     //       })
  //     //   })
  //     //   .catch((error: Error) => {
  //     //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     //   })
  //   } else {
  //     let error: Error, result: any;
  //     [error, result] = await to(serviceInstance.getMicrocredit(campaign.address)
  //       .then((instance) => {
  //         return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
  //       })
  //       .catch((error) => {
  //         return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //       })
  //     );
  //     if (error) {
  //       this.escapeBlockchainError(error, "SpendFund")
  //       return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     }

  //     await this.transaction.create({
  //       ...result,
  //       ...support,
  //       type: 'SpendFund',
  //       tokens: _tokens * (-1)
  //     });

  //     response.locals['extras'] = {
  //       tokens: _tokens,
  //     };
  //     next();

  //     // response.status(200).send({
  //     //   message: "Tokens spend",
  //     //   code: 200
  //     // });

  //     // await serviceInstance.getMicrocredit(campaign.address)
  //     //   .then((instance) => {
  //     //     return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
  //     //       .then(async (result: any) => {

  //     //         await this.transaction.create({
  //     //           ...result,
  //     //           ...support,
  //     //           type: 'SpendFund',
  //     //           tokens: _tokens * (-1)
  //     //         });

  //     //         response.locals['extras'] = {
  //     //           tokens: _tokens,
  //     //         };
  //     //         next();

  //     //         // response.status(200).send({
  //     //         //   message: "Tokens spend",
  //     //         //   code: 200
  //     //         // });
  //     //       })
  //     //       .catch((error: Error) => {
  //     //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     //       })
  //     //   })
  //     //   .catch((error: Error) => {
  //     //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     //   })
  //   }
  // }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;
    const user: User = request.user;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.transaction.find({
      $and: [
        { $or: [{ member_id: user._id }, { partner_id: user._id }] },
        { $or: [{ type: "PromiseFund" }, { type: "SpendFund" }, { type: "ReceiveFund" }, { type: "RevertFund" }] }
      ]
    }).select({
      "_id": 1,
      "support_id": 1,
      "partner_id": 1,
      "partner_name": 1,
      "member_id": 1,
      "campaign_id": 1,
      "campaign_title": 1,
      "method": 1,
      "payment_id": 1,
      "tokens": 1,
      "type": 1,
      "tx": 1,
      "createdAt": 1
    }).sort({ 'createdAt': -1, '_id': -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: transactions,
      code: 200
    });
  }
}

export default MicrocreditController;
