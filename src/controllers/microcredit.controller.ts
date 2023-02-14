

import e, * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var path = require('path');

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

import BlockchainRegistrationService from '../utils/blockchain.registrations';
const registrationService = new BlockchainRegistrationService();

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
import { User, Partner, PartnerPayment, MicrocreditCampaign, MicrocreditSupport, MicrocreditTransaction, SupportStatus, TransactionStatus, Member, SupportPayment, MicrocreditTransactionType } from '../_interfaces/index';

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
import transactionModel from '../models/microcredit.transaction.model';
import microcreditSupport from '../models/support.model';

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();
  private transactionModel = transactionModel;
  private microcreditSupport = microcreditSupport;

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

  /** NEW */
  private isError = (err: unknown): err is Error => err instanceof Error;

  private formatDate(date: Date): string {
    var d: Date = new Date(date),
      month: string = ('0' + (d.getMonth() + 1)).slice(-2),
      day: string = ('0' + d.getDate()).slice(-2),
      year: string = (d.getFullYear()).toString();

    return [year, month, day].join('-');
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

  private createPayment = async (partner: Partner, data: EarnTokensDto): Promise<SupportPayment> => {
    return {
      _id: convertHelper.indexToPayment(
        ((await this.transactionModel.find({ type: MicrocreditTransactionType.PromiseFund })).filter((o: MicrocreditTransaction) => {
          return this.formatDate(o.createdAt) == this.formatDate(new Date())
        })).length),
      method: (data.method == 'store') ?
        {
          bic: 'store',
          name: 'Store',
          value: partner.address.street + ", " + partner.address.city + " " + partner.address.postCode
        } : ((partner.payments).filter(function (el: PartnerPayment) { return el.bic == data.method })[0])
    };
  }

  private oneClickEarnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    const _support_id = new ObjectId();
    const _payment: SupportPayment = await this.createPayment(partner, data)

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(this.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

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
    const _payment: SupportPayment = await this.createPayment(partner, data);

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(this.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

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
    const _payment: SupportPayment = await this.createPayment(partner, data);

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(this.microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      currentTokens: (data.paid) ? data._amount : 0,
      payment: _payment,
      status: (data.paid) ? SupportStatus.PAID : SupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(this.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailService.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailService.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

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
      /** Transaction Block (Microcredit - Receive) */
      let transaction_error: Error, transaction_result: any;
      [transaction_error, transaction_result] = await to(this.createReceiveTransaction(campaign, support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    } else {
      /** Transaction Block (Microcredit - Revert) */
      let transaction_error: Error, transaction_result: any;
      [transaction_error, transaction_result] = await to(this.createRevertTransaction(campaign, support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - Change Status to Member) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailService.changeSupportStatus(request.headers['content-language'], (support.member as Member).email, support).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

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

    let error: Error, updated_support: MicrocreditSupport;
    [error, updated_support] = await to(this.microcreditSupport.findOneAndUpdate({
      _id: support._id
    }, {
      $set: {
        currentTokens: support.initialTokens - data._tokens,
        status: ((support.status == SupportStatus.PAID) && (support.initialTokens - data._tokens <= 0)) ? SupportStatus.COMPLETED : SupportStatus.PAID
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Microcredit - Spend) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createSpendTransaction(campaign, member, data, support).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Microcredit - Redeem Support to Member) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailService.redeemSupport(request.headers['content-language'], member.email, campaign, support, data).catch());
    if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));

    response.status(200).send({
      message: 'Tokens Spent',
      code: 200
    });
  }

  /**
   * 
   * Microcredit Transactions Functions (readTransactions, createPromiseTransaction, createReceiveTransaction, createRevertTransaction, createSpendTransaction)
   * 
   */

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;
    const user: User = request.user;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.transactionModel.find({
      $and: [
        { $or: [{ member_id: user._id.toString() }, { partner_id: user._id.toString() }] },
        { $or: [{ type: MicrocreditTransactionType.PromiseFund }, { type: MicrocreditTransactionType.SpendFund }, { type: MicrocreditTransactionType.ReceiveFund }, { type: MicrocreditTransactionType.RevertFund }] }
      ]
    }).populate({
      path: 'support'
    })
      .select({
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

  private createPromiseTransaction = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto, support_id: MicrocreditSupport['_id']) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerPromisedFund(campaign, member, data).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: MicrocreditTransaction;
    // [error, transaction] = await to(
    return await this.transactionModel.create({
      support: support_id,

      ...blockchain_result,

      data: data,

      type: MicrocreditTransactionType.PromiseFund,
      status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

      /** begin: To be Removed in Next Version */
      member_id: (member as Member)._id,
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      support_id: support_id,
      partner_id: (campaign.partner as Partner)._id,
      partner_name: (campaign.partner as Partner).name,
      /** end: To be Removed in Next Version */

      tokens: data._amount,
    })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  private createReceiveTransaction = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerReceivedFund(campaign, support).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: MicrocreditTransaction;
    // [error, transaction] = await to(
    return await this.transactionModel.create({
      support: support._id,

      ...blockchain_result,

      type: MicrocreditTransactionType.ReceiveFund,
      status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

      /** begin: To be Removed in Next Version */
      member_id: (support.member as Member)._id,
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      support_id: support._id,
      partner_id: (campaign.partner as Partner)._id,
      partner_name: (campaign.partner as Partner).name,
      /** end: To be Removed in Next Version */

      tokens: 0,
      payoff: support.initialTokens
    })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  private createRevertTransaction = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerRevertFund(campaign, support).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: MicrocreditTransaction;
    // [error, transaction] = await to(
    return await this.transactionModel.create({
      support: support._id,

      ...blockchain_result,

      type: MicrocreditTransactionType.RevertFund,
      status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

      /** begin: To be Removed in Next Version */
      member_id: (support.member as Member)._id,
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      support_id: support._id,
      partner_id: (campaign.partner as Partner)._id,
      partner_name: (campaign.partner as Partner).name,
      /** end: To be Removed in Next Version */

      tokens: 0,
      payoff: support.initialTokens * (-1)
    })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  private createSpendTransaction = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto, support: MicrocreditSupport) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerSpentFund(campaign, member, data).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: MicrocreditTransaction;
    // [error, transaction] = await to(
    return await this.transactionModel.create({
      support: support._id,

      ...blockchain_result,

      data: data,

      type: MicrocreditTransactionType.SpendFund,
      status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

      /** begin: To be Removed in Next Version */
      member_id: (support.member as Member)._id,
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      support_id: support._id,
      partner_id: (campaign.partner as Partner)._id,
      partner_name: (campaign.partner as Partner).name,
      /** end: To be Removed in Next Version */

      tokens: data._tokens * (-1)
    })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  /**
   * 
   * Blockchain Register Functions (registerPromisedFund, registerReceivedFund, registerRevertFund, registerSpentFund)
   * 
   */

  // private registerPromisedFund = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto) => {
  //   return await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  // }

  // private registerReceivedFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
  //   return await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.fundReceived(support.contractIndex, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  // }

  // private registerRevertFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
  //   return await to(serviceInstance.getMicrocredit(campaign.address)
  //     .then((instance) => {
  //       return instance.revertFund(support.contractIndex, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //     })
  //   );
  // }

  // private registerSpentFund = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto) => {
  //   if (campaign.quantitative) {
  //     return await to(serviceInstance.getMicrocredit(campaign.address)
  //       .then((instance) => {
  //         return instance.spend('0x' + member.account.address, data._tokens, serviceInstance.address)
  //       })
  //       .catch((error) => {
  //         return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //       })
  //     );
  //   } else {
  //     return await to(serviceInstance.getMicrocredit(campaign.address)
  //       .then((instance) => {
  //         return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
  //       })
  //       .catch((error) => {
  //         return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //       })
  //     );
  //   }
  // }
}

export default MicrocreditController;








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