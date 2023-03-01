

import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
// var path = require('path');

/**
 * Blockchain Service
 */
// import { BlockchainService } from '../services/blockchain.service';
// const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// import BlockchainRegistrationService from '../utils/blockchain.util';
// const registrationService = new BlockchainRegistrationService();

/**
 * Emails Util
 */
import EmailsUtil from '../utils/email.util';
const emailsUtil = new EmailsUtil();

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
import { User, Partner, PartnerPayment, MicrocreditCampaign, MicrocreditSupport, MicrocreditTransaction, MicrocreditSupportStatus, TransactionStatus, Member, MicrocreditSupportPayment, MicrocreditTransactionType } from '../_interfaces/index';

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
// import OffsetHelper from '../middleware/items/offset.helper';

// /**
//  * Helper's Instance
//  */
// const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import transactionModel from '../models/microcredit.transaction.model';
import microcreditSupport from '../models/support.model';

/**
 * Transactions Util
 */
import MicrocreditTransactionUtil from '../utils/microcredit.transactions';
const transactionsUtil = new MicrocreditTransactionUtil();

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {

    /**
     * One Click
     */

    this.router.get(`${this.path}/one-click-balance/:partner_id/:campaign_id/:token`,
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID),
      usersMiddleware.partner, usersMiddleware.member, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,
      this.readBalance
    );

    this.router.post(`${this.path}/one-click/:partner_id/:campaign_id/:token`,
      oneClickMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, usersMiddleware.member, itemsMiddleware.microcreditCampaign,
      balanceMiddleware.microcredit_balance,
      checkMiddleware.canEarnMicrocredit,
      this.oneClickEarnTokens,
    );

    /**
     * Earn & Redeem
     */

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id`,
      authMiddleware,
      validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto),
      usersMiddleware.partner, itemsMiddleware.microcreditCampaign,
      usersMiddleware.member,
      balanceMiddleware.microcredit_balance,
      checkMiddleware.canEarnMicrocredit,
      this.autoEarnTokens,
    );

    this.router.post(`${this.path}/earn/:partner_id/:campaign_id/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, usersMiddleware.partner,
      validationBodyMiddleware(EarnTokensDto), itemsMiddleware.microcreditCampaign,
      validationParamsMiddleware(IdentifierToDto), usersMiddleware.member,
      balanceMiddleware.microcredit_balance,
      checkMiddleware.canEarnMicrocredit,
      this.earnTokens,
    );

    this.router.put(`${this.path}/confirm/:partner_id/:campaign_id/:support_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID), accessMiddleware.belongsTo,
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, usersMiddleware.member,
      checkMiddleware.canConfirmRevertPayment,
      this.confirmTokens,
    );

    this.router.post(`${this.path}/redeem/:partner_id/:campaign_id/:support_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(SupportID), accessMiddleware.belongsTo,
      validationBodyMiddleware(RedeemTokensDto),
      itemsMiddleware.microcreditCampaign, itemsMiddleware.microcreditSupport, usersMiddleware.member,
      checkMiddleware.canRedeemMicrocredit,
      this.redeemTokens,
    );

    /**
     * Badge & Transactions
     */

    this.router.get(`${this.path}/transactions/:offset`,
      authMiddleware,
      this.readTransactions);

    this.router.get(`${this.path}/badge`,
      authMiddleware,
      balanceMiddleware.microcredit_activity,
      this.readActivity);
  }

  /**
   * 
   * Secondary Functions (General)
   * 
   */

  private formatDate(date: Date): string {
    var d: Date = new Date(date),
      month: string = ('0' + (d.getMonth() + 1)).slice(-2),
      day: string = ('0' + d.getDate()).slice(-2),
      year: string = (d.getFullYear()).toString();

    return [year, month, day].join('-');
  }

  private createPayment = async (partner: Partner, data: EarnTokensDto): Promise<MicrocreditSupportPayment> => {
    return {
      _id: convertHelper.indexToPayment(
        ((await transactionModel.find({ type: MicrocreditTransactionType.PromiseFund })).filter((o: MicrocreditTransaction) => {
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

  /**
   * 
   * Main Functions (Route: `/microcredit`)
   * 
   */

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

  private oneClickEarnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;

    const member: User = response.locals.member;
    const partner: Partner = response.locals.partner;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    const _support_id = new ObjectId();
    const _payment: MicrocreditSupportPayment = await this.createPayment(partner, data)

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      // currentTokens: (data.paid) ? data._amount : 0,
      currentTokens: data._amount,
      payment: _payment,
      status: (data.paid) ? MicrocreditSupportStatus.PAID : MicrocreditSupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(transactionsUtil.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToPartner: ${email_error}`);

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailsUtil.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToMember: ${email_error}`);

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
    const _payment: MicrocreditSupportPayment = await this.createPayment(partner, data);

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      // currentTokens: (data.paid) ? data._amount : 0,
      currentTokens: data._amount,
      payment: _payment,
      status: (data.paid) ? MicrocreditSupportStatus.PAID : MicrocreditSupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(transactionsUtil.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToPartner: ${email_error}`);

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailsUtil.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToMember: ${email_error}`);

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
    const _payment: MicrocreditSupportPayment = await this.createPayment(partner, data);

    /** Transaction Block (Microcredit - Promise) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createPromiseTransaction(campaign, member, data, _support_id).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    let error: Error, created_support: MicrocreditSupport;
    [error, created_support] = await to(microcreditSupport.create({
      _id: _support_id,
      member: member._id,
      campaign: campaign_id,
      initialTokens: data._amount,
      // currentTokens: (data.paid) ? data._amount : 0,
      currentTokens: data._amount,
      payment: _payment,
      status: (data.paid) ? MicrocreditSupportStatus.PAID : MicrocreditSupportStatus.UNPAID,
      contractRef: transaction_result?.logs[0]?.args.ref,
      contractIndex: transaction_result?.logs[0]?.args.index,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (data.paid) {
      /** Transaction Block (Microcredit - Receive) */
      [transaction_error, transaction_result] = await to(transactionsUtil.createReceiveTransaction(campaign, created_support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - New Support to Partner) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.newSupportPartner(request.headers['content-language'], partner.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToPartner: ${email_error}`);

    /** Email Block (Microcredit - New Support to Member) */
    [email_error, email_result] = await to(emailsUtil.newSupportMember(request.headers['content-language'], member.email, campaign, _payment, data).catch());
    if (email_error) throw (`EMAIL ERROR - NewSupportToMember: ${email_error}`);

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
    [error, updated_support] = await to(microcreditSupport.findOneAndUpdate(
      {
        "_id": support._id
      }, {
      "$set": {
        // currentTokens: (support.status == SupportStatus.UNPAID) ? support.initialTokens : 0,
        "status": (support.status == MicrocreditSupportStatus.UNPAID) ? MicrocreditSupportStatus.PAID : MicrocreditSupportStatus.UNPAID
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (support.status != MicrocreditSupportStatus.PAID) {
      /** Transaction Block (Microcredit - Receive) */
      let transaction_error: Error, transaction_result: any;
      [transaction_error, transaction_result] = await to(transactionsUtil.createReceiveTransaction(campaign, support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    } else {
      /** Transaction Block (Microcredit - Revert) */
      let transaction_error: Error, transaction_result: any;
      [transaction_error, transaction_result] = await to(transactionsUtil.createRevertTransaction(campaign, support).catch());
      if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));
    }

    /** Email Block (Microcredit - Change Status to Member) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.changeSupportStatus(request.headers['content-language'], (support.member as Member).email, support).catch());
    if (email_error) throw (`EMAIL ERROR - ChangeSupportStatus: ${email_error}`);

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
    [error, updated_support] = await to(microcreditSupport.findOneAndUpdate({
      "_id": support._id
    }, {
      "$set": {
        "currentTokens": support.currentTokens - data._tokens,
        "status": ((support.status == MicrocreditSupportStatus.PAID) && (support.initialTokens - data._tokens <= 0)) ? MicrocreditSupportStatus.COMPLETED : MicrocreditSupportStatus.PAID
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Microcredit - Spend) */
    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createSpendTransaction(campaign, member, data, support).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Microcredit - Redeem Support to Member) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.redeemSupport(request.headers['content-language'], member.email, campaign, support, data).catch());
    if (email_error) throw (`EMAIL ERROR - RedeemSupport: ${email_error}`);

    response.status(200).send({
      message: 'Tokens Spent',
      code: 200
    });
  }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const date = request.params['date'] || '0';
    const { page, size } = request.query;

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(transactionsUtil.readMicrocreditTransactions(user, [MicrocreditTransactionType.PromiseFund, MicrocreditTransactionType.ReceiveFund, MicrocreditTransactionType.RevertFund, MicrocreditTransactionType.SpendFund], date, { page: page as string, size: size as string })).catch();

    response.status(200).send({
      data: transactions,
      code: 200
    });
  }
}

export default MicrocreditController;