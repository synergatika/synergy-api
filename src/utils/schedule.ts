import * as schedule from 'node-schedule';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Blockchain Serice
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(`${process.env.ETH_REMOTE_API}`, path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`), `${process.env.ETH_API_ACCOUNT_PRIVKEY}`);

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
import { User, MicrocreditCampaign, MicrocreditSupport, TransactionStatus, RegistrationTransaction, MicrocreditTransaction, LoyaltyTransaction, LoyaltyTransactionType, RegistrationTransactionType, MicrocreditTransactionType, Account, Partner, Member } from '../_interfaces/index';

/**
 * Models
 */
import registrationTransactionModel from '../models/registration.transaction.model';
import microcreditTransactionModel from '../models/microcredit.transaction.model';
import loyaltyTransactionModel from '../models/loyalty.transaction.model';
import microcreditCampaignModel from '../models/campaign.model';
import microcreditSupportModel from '../models/support.model';
import userModel from '../models/user.model';
import { EarnTokensDto, RedeemTokensDto } from '_dtos';

class Schedule {
  private userModel = userModel;
  private registrationTransactionModel = registrationTransactionModel;
  private microcreditTransactionModel = microcreditTransactionModel;
  private loyaltyTransactionModel = loyaltyTransactionModel;
  private microcreditCampaignModel = microcreditCampaignModel;
  private microcreditSupportModel = microcreditSupportModel;

  // private repeatEvery: string = '0 0 3 * * *'; // every day at 3am
  private repeatEvery: string = '55 * * * * *'; // every day at 3am
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
      console.log(`\n#Starting <<Notify Members For Upcoming Redeems>> Scheduled Tasks @${new Date()}... `)
      const nowStarts = new Date();
      nowStarts.setDate(nowStarts.getDate() + 1);
      nowStarts.setHours(0); nowStarts.setMinutes(0); nowStarts.setSeconds(1); nowStarts.setMilliseconds(0);

      const nowEnds = new Date();
      nowEnds.setDate(nowEnds.getDate() + 1);
      nowEnds.setHours(23); nowEnds.setMinutes(59); nowEnds.setSeconds(59); nowEnds.setMilliseconds(0);

      const secondsStart = parseInt(nowStarts.getTime().toString());
      const secondsEnd = parseInt(nowEnds.getTime().toString());

      let error: Error, campaigns: MicrocreditCampaign[];
      [error, campaigns] = await to(this.microcreditCampaignModel
        .find({
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
      if (error) return;

      campaigns.forEach(async (item: MicrocreditCampaign) => {
        const emails_to: string[] = await this.readSupportsByCampaign(item);
        console.log(`${item.title} , ${emails_to}`)
        if (emails_to.length) await emailService.campaignStarts(emails_to, item);
      });

      console.log(`<<Notify Members For Upcoming Redeems>> Scheduled Tasks Ended... `)

      // const supports: MicrocreditSupport[] = await this.readSupports(campaigns);
      // const campaignWithSupports = campaigns.map((a: MicrocreditCampaign) =>
      //   Object.assign({}, a,
      //     {
      //       supports: supports.filter((b: MicrocreditSupport) => ((b.campaign as MicrocreditCampaign)._id).toString() === (a._id).toString()),
      //     }
      //   )
      // );

      // campaignWithSupports.forEach(async (el) => {
      //   console.log("----- ----- ----- -----")
      //   console.log(el)
      //   await emailService.campaignStarts(el);
      // });

    });
  }

  public readSupportsByCampaign = async (_campaign: MicrocreditCampaign) => {

    let error: Error, supports: MicrocreditSupport[];
    [error, supports] = await to(this.microcreditSupportModel
      .find({
        campaign: _campaign._id
      })
      .populate({
        path: "member"
      }).catch());

    // let error: Error, supports: any[];
    // [error, supports] = await to(this.microcreditTransactionModel.aggregate([
    //   {
    //     $match: {
    //       'campaign_id': { $in: campaigns.map(a => (a._id).toString()) }
    //     }
    //   },
    //   { $sort: { date: 1 } },
    //   {
    //     $group:
    //     {
    //       _id: "$member_id",
    //       campaign_id: { '$first': "$campaign_id" },
    //       initialTokens: { '$first': "$tokens" },
    //       currentTokens: { '$sum': '$tokens' },
    //       method: { '$first': "$method" },
    //       payment_id: { '$first': "$payment_id" },
    //       type: { '$last': "$type" },
    //       createdAt: { '$first': "$createdAt" },
    //     }
    //   }
    // ]).exec().catch());
    // if (error) return;

    // console.log("supports");
    // console.log(supports.map(a => a._id));
    // console.log(supports.map(a => (a.member as Member)._id));
    const users: User[] = await this.readUsersBySupports(supports);
    // const supportsWithUsers = supports.map((a: MicrocreditSupport) =>
    //   Object.assign({}, a,
    //     {
    //       member_email: users.find((b: User) => b._id === (a.member as Member)._id).email,
    //     }
    //   )
    // );
    return users.map(o => o.email);
    // return supportsWithUsers;
  }

  public readUsersBySupports = async (supports: MicrocreditSupport[]) => {
    let error: Error, users: User[];

    [error, users] = await to(this.userModel
      .find({
        _id: { $in: supports.map((a: MicrocreditSupport) => (a.member as Member)._id) }
      })
      .select({
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
      console.log(`\n#Starting <<Register Failed Transactions>> Scheduled Tasks @${new Date()}... `)
      await this.readPendingRegistrationTransactions();
      await this.readPendingLoayltyTransactions();
      await this.readPendingCampaigns();
      await this.readPendingMicrocreditPromiseTransactions();
      await this.readPendingMicrocreditTransactions();
      console.log(`<<Register Failed Transactions>> Scheduled Tasks Ended... `)
    });
  }

  public readPendingRegistrationTransactions = async () => {
    let error: Error, transactions: RegistrationTransaction[];
    [error, transactions] = await to(this.registrationTransactionModel
      .find({
        'status': TransactionStatus.PENDING
      })
      .populate([{
        path: 'user'
      }])
      .sort({ createdAt: 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: RegistrationTransaction) => {
      let transaction: RegistrationTransaction;
      [error, transaction] = await to(this.updateRegistrationTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    // for (let i = 0; i < transactions.length; i++) {
    //   let transaction: RegistrationTransaction;
    //   [error, transaction] = await to(this.updateRegistrationTransaction(transactions[i]).catch());

    //   if (!error && transaction) completed++;
    // }

    console.log(`${completed} of ${transactions.length} <<User Accounts>> registered in blockchain`);
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
      .sort({ createdAt: 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: LoyaltyTransaction) => {
      let transaction: LoyaltyTransaction;
      [error, transaction] = await to(this.updateLoyaltyTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    // for (let i = 0; i < transactions.length; i++) {
    //   let transaction: LoyaltyTransaction;
    //   [error, transaction] = await to(this.updateLoyaltyTransaction(transactions[i]).catch());

    //   if (!error && transaction) completed++;
    // }

    console.log(`${completed} of ${transactions.length} <<Loyalty Transactions>> registered in blockchain`);
  }

  public readPendingCampaigns = async () => {
    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.microcreditCampaignModel
      .find({ 'registered': TransactionStatus.PENDING })
      .populate([{
        path: 'partner'
      }])
      .sort({ createdAt: 1 })
      .catch());

    let completed = 0;
    campaigns.forEach(async (item: MicrocreditCampaign) => {
      let campaign: MicrocreditCampaign;
      [error, campaign] = await to(this.updateRegisterMicrocreditCampaigns(item).catch());

      if (!error && campaign) completed++;
    });

    // for (let i = 0; i < campaigns.length; i++) {
    //   let campaign: MicrocreditCampaign;
    //   [error, campaign] = await to(this.updateRegisterMicrocreditCampaigns(campaigns[i]).catch());

    //   if (!error && campaign) completed++;
    // }

    console.log(`${completed} of ${campaigns.length} <<Microcredit Campaigns>> registered in blockchain`);
  }

  public readPendingMicrocreditPromiseTransactions = async () => {
    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.microcreditTransactionModel
      .find(
        {
          "$and": [
            { 'status': TransactionStatus.PENDING },
            { 'type': MicrocreditTransactionType.PromiseFund }
          ]
        }
      )
      .populate({
        path: 'support',
        populate: [{
          path: 'campaign',
          populate: {
            path: 'partner'
          }
        }, {
          path: 'member'
        }]
      })
      .sort({ createdAt: 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: MicrocreditTransaction) => {
      let transaction: MicrocreditTransaction;
      [error, transaction] = await to(this.updateMicrocreditTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    // for (let i = 0; i < transactions.length; i++) {
    //   let transaction: MicrocreditTransaction;
    //   [error, transaction] = await to(this.updateMicrocreditTransaction(transactions[i]).catch());

    //   if (!error && transaction) completed++;
    // }

    console.log(`${completed} of ${transactions.length} <<Microcredit Transactions (Promise)>> registered in blockchain`);
  }

  public readPendingMicrocreditTransactions = async () => {
    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(this.microcreditTransactionModel
      .find(
        {
          "$and": [
            { 'status': TransactionStatus.PENDING },
            {
              "$or": [
                { 'type': MicrocreditTransactionType.ReceiveFund },
                { 'type': MicrocreditTransactionType.RevertFund },
                { 'type': MicrocreditTransactionType.SpendFund }
              ]
            }
          ]
        }
      )
      .populate({
        path: 'support',
        populate: [{
          path: 'campaign',
          populate: {
            path: 'partner'
          }
        }, {
          path: 'member'
        }]
      })
      .sort({ createdAt: 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item) => {
      let transaction: MicrocreditTransaction;
      [error, transaction] = await to(this.updateMicrocreditTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    // for (let i = 0; i < transactions.length; i++) {
    //   let transaction: MicrocreditTransaction;
    //   [error, transaction] = await to(this.updateMicrocreditTransaction(transactions[i]).catch());

    //   if (!error && transaction) completed++;
    // }

    console.log(`${completed} of ${transactions.length} <<Microcredit Transactions (Receive, Revert, Spend)>> registered in blockchain`);
  }

  private updateRegistrationTransaction = async (_transaction: RegistrationTransaction) => {
    const user: User = _transaction.user;
    if (!user) return;

    const newAccount: Account = serviceInstance.unlockWallet(user.account, (user.email) ? user.email : user.card);

    let blockchain_error: Error, blockchain_result: any;
    if (_transaction.type === RegistrationTransactionType.RegisterMember) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerMemberAccount(newAccount).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    } else if (_transaction.type === RegistrationTransactionType.RegisterPartner) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerPartnerAccount(newAccount).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    if (blockchain_result) {
      let error: Error, transaction: RegistrationTransaction;
      [error, transaction] = await to(this.registrationTransactionModel.updateOne({
        '_id': new ObjectId(_transaction._id)
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING
        }
      }, { new: true }).catch());

      return transaction;
    }

    return null;
  }

  private updateLoyaltyTransaction = async (_transaction: LoyaltyTransaction) => {

    let blockchain_error: Error, blockchain_result: any;

    if (_transaction.type === LoyaltyTransactionType.EarnPoints) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerEarnLoyalty(_transaction.partner, _transaction.member, _transaction.points).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    } else if ((_transaction.type === LoyaltyTransactionType.RedeemPoints) || (_transaction.type === LoyaltyTransactionType.RedeemPointsOffer)) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerRedeemLoyalty(_transaction.partner, _transaction.member, _transaction.points * (-1)).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }

    if (blockchain_result) {
      let error: Error, transaction: LoyaltyTransaction;
      [error, transaction] = await to(this.loyaltyTransactionModel.updateOne({
        '_id': _transaction._id
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING
        }
      }, { new: true }).catch());

      return transaction;
    }

    return null;
  }

  private updateRegisterMicrocreditCampaigns = async (_campaign: MicrocreditCampaign) => {

    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerMicrocreditCampaign(_campaign.partner as Partner, _campaign).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    if (blockchain_result) {
      let error: Error, campaign: MicrocreditCampaign;
      [error, campaign] = await to(this.microcreditCampaignModel.findOneAndUpdate({
        _id: _campaign._id
      }, {
        "$set": {
          "address": blockchain_result?.address,
          "transactionHash": blockchain_result?.transactionHash,
          "registered": (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
        }
      }).catch());

      return campaign;
    }

    return null;
  }

  private updateMicrocreditTransaction = async (_transaction: MicrocreditTransaction) => {
    let blockchain_error: Error, blockchain_result: any;

    if (_transaction.type === MicrocreditTransactionType.PromiseFund) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerPromisedFund(_transaction.support.campaign as MicrocreditCampaign, _transaction.support.member as Member, _transaction.data as EarnTokensDto).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

      if (blockchain_result) {
        let error: Error, support: MicrocreditSupport;
        [error, support] = await to(this.microcreditSupportModel.updateOne({
          _id: _transaction.support._id
        }, {
          "$set": {
            "contractRef": blockchain_result?.logs[0].args.ref,
            "contractIndex": blockchain_result?.logs[0].args.index,
          }
        }).catch());
        if (error) return null;
      }
    }
    else if (_transaction.type === MicrocreditTransactionType.ReceiveFund) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerReceivedFund(_transaction.support.campaign as MicrocreditCampaign, _transaction.support).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    else if (_transaction.type === MicrocreditTransactionType.RevertFund) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerRevertFund(_transaction.support.campaign as MicrocreditCampaign, _transaction.support).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }
    else if (_transaction.type === MicrocreditTransactionType.SpendFund) {
      [blockchain_error, blockchain_result] = await to(registrationService.registerSpentFund(_transaction.support.campaign as MicrocreditCampaign, _transaction.support.member as Member, _transaction.data as RedeemTokensDto).catch());
      if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
    }

    if (blockchain_result) {
      let error: Error, transaction: MicrocreditTransaction;
      [error, transaction] = await to(this.microcreditTransactionModel.updateOne({
        '_id': _transaction._id
      }, {
        '$set': {
          ...blockchain_result,
          status: (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING
        }
      }, { new: true }).catch());

      return transaction;
    }

    return null;
  }
}
export default new Schedule();
