import * as schedule from 'node-schedule';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Blockchain Serice
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(
  `${process.env.ETH_REMOTE_API}`,
  path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`),
  `${process.env.ETH_API_ACCOUNT_PRIVKEY}`
);

import BlockchainRegistrationService from '../utils/blockchain.registrations';
const registrationService = new BlockchainRegistrationService()

/**
 * Email Service
 */
import EmailService from '../utils/emailService';
const emailService = new EmailService();

/**
 * Interfaces
 */
import { User, MicrocreditCampaign, MicrocreditSupport, TransactionStatus, RegistrationTransaction, MicrocreditTransaction, LoyaltyTransaction, LoyaltyTransactionType, RegistrationTransactionType, MicrocreditTransactionType } from '../_interfaces/index';

/**
 * Models
 */
import registrationTransactionModel from '../models/registration.transaction.model';
import microcreditTransactionModel from '../models/microcredit.transaction.model';
import loyaltyTransactionModel from '../models/loyalty.transaction.model';
import campaignModel from '../models/campaign.model';
import userModel from '../models/user.model';
import { EarnTokensDto, RedeemTokensDto } from '_dtos';

class Schedule {
  private userModel = userModel;
  private registrationTransactionModel = registrationTransactionModel;
  private microcreditTransactionModel = microcreditTransactionModel;
  private loyaltyTransactionModel = loyaltyTransactionModel;
  private campaignModel = campaignModel;

  private repeatEvery: string = '0 0 3 * * *'; // every day at 3am
  private repeatEveryRegistration: string = '30 * * * * *'; // every minute at .30 seconds

  constructor() { }

  private isError = (err: unknown): err is Error => err instanceof Error;

  /**
   * 
   * Campaign Starts Functions
   * 
   */
  public campaingStarts = () => {

    schedule.scheduleJob(this.repeatEvery, async () => {

      const nowStarts = new Date();
      nowStarts.setDate(nowStarts.getDate() + 1);
      nowStarts.setHours(0); nowStarts.setMinutes(0); nowStarts.setSeconds(1); nowStarts.setMilliseconds(0);

      const nowEnds = new Date();
      nowEnds.setDate(nowEnds.getDate() + 1);
      nowEnds.setHours(23); nowEnds.setMinutes(59); nowEnds.setSeconds(59); nowEnds.setMilliseconds(0);

      const secondsStart = parseInt(nowStarts.getTime().toString());
      const secondsEnd = parseInt(nowEnds.getTime().toString());

      let error: Error, campaigns: MicrocreditCampaign[];
      [error, campaigns] = await to(this.campaignModel.find({
        $and: [
          { 'status': 'published' },
          { 'redeemable': true },
          { 'redeemStarts': { $gt: secondsStart } },
          { 'redeemStarts': { $lt: secondsEnd } },
        ]
      })
        .populate([{
          path: 'partner'
        }])
        .sort({ updatedAt: -1 })
        .catch());
      // [error, campaigns] = await to(this.user.aggregate([{
      //   $unwind: '$microcredit'
      // }, {
      //   $match: {
      //     $and: [
      //       { 'microcredit.status': 'published' },
      //       { 'microcredit.redeemable': true },
      //       { 'microcredit.redeemStarts': { $gt: secondsStart } },
      //       { 'microcredit.redeemStarts': { $lt: secondsEnd } },
      //     ]
      //   }
      // }, {
      //   $project: {
      //     _id: false,
      //     partner_id: '$_id',
      //     partner_slug: '$slug',
      //     partner_name: '$name',
      //     partner_email: '$email',
      //     partner_imageURL: '$imageURL',

      //     partner_payments: '$payments',
      //     partner_address: '$address',
      //     partner_contacts: '$contacts',
      //     partner_phone: '$phone',

      //     campaign_id: '$microcredit._id',
      //     campaign_slug: '$microcredit.slug',
      //     campaign_imageURL: '$microcredit.imageURL',
      //     title: '$microcredit.title',
      //     subtitle: '$microcredit.subtitle',
      //     terms: '$microcredit.terms',
      //     description: '$microcredit.description',
      //     category: '$microcredit.category',
      //     access: '$microcredit.access',

      //     quantitative: '$microcredit.quantitative',
      //     stepAmount: '$microcredit.stepAmount',
      //     minAllowed: '$microcredit.minAllowed',
      //     maxAllowed: '$microcredit.maxAllowed',
      //     maxAmount: '$microcredit.maxAmount',

      //     redeemStarts: '$microcredit.redeemStarts',
      //     redeemEnds: '$microcredit.redeemEnds',
      //     startsAt: '$microcredit.startsAt',
      //     expiresAt: '$microcredit.expiresAt',

      //     createdAt: '$microcredit.createdAt',
      //     updatedAt: '$microcredit.updatedAt'
      //   }
      // }, {
      //   $sort: {
      //     updatedAt: -1
      //   }
      // }
      // ]).exec().catch());
      if (error) return;

      const supports: MicrocreditSupport[] = await this.readSupports(campaigns);
      const campaignWithSupports = campaigns.map((a: MicrocreditCampaign) =>
        Object.assign({}, a,
          {
            supports: (supports).filter((b: MicrocreditSupport) => ((b.campaign as MicrocreditCampaign)._id).toString() === (a._id).toString()),
          }
        )
      );

      campaignWithSupports.forEach(async (el) => {
        await emailService.campaignStarts(el);
      });

    });
  }

  public readSupports = async (campaigns: MicrocreditCampaign[]) => {

    let error: Error, supports: any[];
    [error, supports] = await to(this.microcreditTransactionModel.aggregate([
      {
        $match: {
          'campaign_id': { $in: campaigns.map(a => (a._id).toString()) }
        }
      },
      { $sort: { date: 1 } },
      {
        $group:
        {
          _id: "$member_id",
          campaign_id: { '$first': "$campaign_id" },
          initialTokens: { '$first': "$tokens" },
          currentTokens: { '$sum': '$tokens' },
          method: { '$first': "$method" },
          payment_id: { '$first': "$payment_id" },
          type: { '$last': "$type" },
          createdAt: { '$first': "$createdAt" },
        }
      }
    ]).exec().catch());
    if (error) return;

    const users: User[] = await this.readUsers(supports);
    const supportsWithUsers = supports.map((a: MicrocreditSupport) =>
      Object.assign({}, a,
        {
          member_email: (users).find((b: User) => (b._id).toString() === (a._id).toString()).email,
        }
      )
    );

    return supportsWithUsers;
  }

  public readUsers = async (supports: MicrocreditSupport[]) => {
    let error: Error, users: User[];

    [error, users] = await to(this.userModel.find({ _id: { $in: supports.map((a: MicrocreditSupport) => (a._id)) } }).select({
      "_id": 1, "email": 1,
    }).catch());

    return users;
  }

  /**
   * 
   * Blockchain Restarts Functions
   * 
   */
  public registerFailedTransactions = () => {
    schedule.scheduleJob(this.repeatEveryRegistration, async () => {
      await this.readPendingRegistrationTransactions();
      await this.readPendingLoayltyTransactions();
      await this.readPendingMicrocreditTransactions();
    });
  }

  public readPendingRegistrationTransactions = async () => {
    let error: Error, transactions: RegistrationTransaction[];
    [error, transactions] = await to(this.registrationTransactionModel
      .find({ 'status': TransactionStatus.PENDING })
      .populate([{
        path: 'user'
      }])
      .sort({ updatedAt: -1 })
      .catch());

    for (let i = 0; i < transactions.length; i++) {
      let transaction: RegistrationTransaction;
      [error, transaction] = await to(this.updateRegistrationTransaction(transactions[i]).catch());
      console.log("Registered Registration Transaction:");
      console.log(transaction);
    }
  }

  public readPendingCampaigns = async () => {
    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.campaignModel
      .find({ 'registered': TransactionStatus.PENDING })
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .catch());
  }

  public readPendingLoayltyTransactions = async () => {
    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(this.loyaltyTransactionModel
      .find({ 'status': TransactionStatus.PENDING })
      .populate([{
        path: 'partner'
      }, {
        path: 'member'
      }, {
        path: 'offer'
      }])
      .sort({ createdAt: -1 })
      .catch());

    for (let i = 0; i < transactions.length; i++) {
      let transaction: LoyaltyTransaction;
      [error, transaction] = await to(this.updateLoyaltyTransaction(transactions[i]).catch());
      console.log("Registered Loyalty Transaction:");
      console.log(transaction);
    }
  }

  public readPendingMicrocreditTransactions = async () => {
    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.microcreditTransactionModel
      .find({ 'status': TransactionStatus.PENDING })
      .populate([{
        path: 'support'
      }])
      .sort({ updatedAt: -1 })
      .catch());

    for (let i = 0; i < transactions.length; i++) {
      let transaction: MicrocreditTransaction;
      [error, transaction] = await to(this.updateMicrocreditTransaction(transactions[i]).catch());
      console.log("Registered Microcredit Transaction:");
      console.log(transaction);
    }
  }

  private updateRegistrationTransaction = async (_transaction: RegistrationTransaction) => {
    const user: User = _transaction.user;
    const newAccount = serviceInstance.unlockWallet(user.account, _transaction.encryptBy);

    let blockchain_error: Error, blockchain_result: any;
    if (_transaction.type === RegistrationTransactionType.RegisterMember) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerMemberAccount(user.account).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    } else if (_transaction.type === RegistrationTransactionType.RegisterPartner) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerPartnerAccount(user.account).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }

    if (blockchain_result) {
      let error: Error, transaction: RegistrationTransaction;
      [error, transaction] = await to(this.registrationTransactionModel.updateOne({
        '_id': new ObjectId(_transaction._id)
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
        }
      }, { new: true }).catch());
      return transaction;
    }

    return null;
  }

  private updateLoyaltyTransaction = async (_transaction: LoyaltyTransaction) => {

    let blockchain_error: Error, blockchain_result: any;

    if (_transaction.type === LoyaltyTransactionType.EarnPoints) {
      [blockchain_error, blockchain_result] = await registrationService.registerEarnLoyalty(_transaction.partner, _transaction.member, _transaction.points);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    } else if ((_transaction.type === LoyaltyTransactionType.RedeemPoints) || (_transaction.type === LoyaltyTransactionType.RedeemPointsOffer)) {
      let blockchain_error: Error, blockchain_result: any;
      [blockchain_error, blockchain_result] = await registrationService.registerRedeemLoyalty(_transaction.partner, _transaction.member, _transaction.points);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }

    if (blockchain_result) {
      let error: Error, transaction: LoyaltyTransaction;
      [error, transaction] = await to(this.loyaltyTransactionModel.updateOne({
        '_id': _transaction._id
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
        }
      }, { new: true }).catch());

      return transaction;
    }

    return null;
  }

  private updateMicrocreditTransaction = async (_transaction: MicrocreditTransaction) => {

    let blockchain_error: Error, blockchain_result: any;

    if (_transaction.type === MicrocreditTransactionType.PromiseFund) {
      [blockchain_error, blockchain_result] = await registrationService.registerPromisedFund(_transaction.campaign, _transaction.member, _transaction.data as EarnTokensDto);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    else if (_transaction.type === MicrocreditTransactionType.ReceiveFund) {
      [blockchain_error, blockchain_result] = await registrationService.registerReceivedFund(_transaction.campaign, _transaction.support);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    else if (_transaction.type === MicrocreditTransactionType.RevertFund) {
      [blockchain_error, blockchain_result] = await registrationService.registerRevertFund(_transaction.campaign, _transaction.support);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    else if (_transaction.type === MicrocreditTransactionType.SpendFund) {
      [blockchain_error, blockchain_result] = await registrationService.registerSpentFund(_transaction.campaign, _transaction.member, _transaction.data as RedeemTokensDto);
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }

    if (blockchain_result) {
      let error: Error, transaction: MicrocreditTransaction;
      [error, transaction] = await to(this.microcreditTransactionModel.updateOne({
        '_id': _transaction._id
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED
        }
      }, { new: true }).catch());

      return transaction;
    }

    return null;
  }
}
export default new Schedule();
