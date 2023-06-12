import * as schedule from 'node-schedule';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Blockchain Serice
 */
import { BlockchainService } from '../services/blockchain.service';
const serviceInstance = new BlockchainService(`${process.env.ETH_REMOTE_API}`, path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`), `${process.env.ETH_API_ACCOUNT_PRIVKEY}`);

import BlockchainRegistrationService from './blockchain.util';
const registrationService = new BlockchainRegistrationService()

/**
 * Emails Util
 */
import EmailsUtil from './email.util';
const emailsUtil = new EmailsUtil();

/**
 * Interfaces
 */
import { User, MicrocreditCampaign, MicrocreditSupport, TransactionStatus, RegistrationTransaction, MicrocreditTransaction, LoyaltyTransaction, MicrocreditTransactionType, Partner, Member, MicrocreditCampaignStatus } from '../_interfaces/index';

/**
 * Models
 */
import userModel from '../models/user.model';
import registrationTransactionModel from '../models/registration.transaction.model';
import loyaltyTransactionModel from '../models/loyalty.transaction.model';
import microcreditCampaignModel from '../models/campaign.model';
import microcreditSupportModel from '../models/support.model';
import microcreditTransactionModel from '../models/microcredit.transaction.model';

/**
 * Transactions Util
 */
import RegistrationTransactionsUtil from './registration.transactions';
const registrationTransactionsUtil = new RegistrationTransactionsUtil;

import LoyaltyTransactionsUtil from './loyalty.transactions';
const loyaltyTransactionsUtil = new LoyaltyTransactionsUtil;

import MicrocreditTransactionsUtil from './microcredit.transactions';
const microcreditTransactionsUtil = new MicrocreditTransactionsUtil;

/**
 * Email Service
 */

class Schedule {
  private userModel = userModel;
  private registrationTransactionModel = registrationTransactionModel;
  private microcreditTransactionModel = microcreditTransactionModel;
  private loyaltyTransactionModel = loyaltyTransactionModel;
  private microcreditCampaignModel = microcreditCampaignModel;
  private microcreditSupportModel = microcreditSupportModel;

  // private repeatEvery: string = '0 0 3 * * *'; // every day at 3am
  private repeatEvery: string = '55 * * * * *'; // every minute at .55 seconds
  private repeatEveryRegistration: string = '30 * * * * *'; // every minute at .30 seconds

  private repeatEveryBlockchainStatus: string = '45 * * * * *'; //every hour at :30 minutes

  constructor() { }

  private isError = (err: unknown): err is Error => err instanceof Error;

  /**
   * 
   * Campaign Starts Functions
   * 
   */
  public campaingStarts = () => {

    schedule.scheduleJob(this.repeatEvery, async () => {
      console.log(`\n---------- ---------- ---------- ---------- ---------- ---------- ----------`)
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
      [error, campaigns] = await to(this.microcreditCampaignModel.find({
        "$and": [
          { "status": MicrocreditCampaignStatus.PUBLISHED },
          { "redeemable": true },
          { "redeemStarts": { $gt: secondsStart } },
          { "redeemStarts": { $lt: secondsEnd } },
        ]
      }).populate([{
        "path": 'partner'
      }])
        .sort({ "updatedAt": -1 })
        .catch());
      if (error) return;

      campaigns.forEach(async (item: MicrocreditCampaign) => {
        const emails_to: string[] = await this.readSupportsByCampaign(item);
        console.log(`${item.title} , ${emails_to}`)
        if (emails_to.length) await emailsUtil.campaignStarts(emails_to, item);
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
      //   await emailsUtil.campaignStarts(el);
      // });

    });
  }

  public readSupportsByCampaign = async (_campaign: MicrocreditCampaign) => {

    let error: Error, supports: MicrocreditSupport[];
    [error, supports] = await to(this.microcreditSupportModel.find({
      "campaign": _campaign._id
    }).populate({
      "path": 'member'
    }).catch());

    const users: User[] = await this.readUsersBySupports(supports);

    return users.map(o => o.email);
  }

  public readUsersBySupports = async (supports: MicrocreditSupport[]) => {
    let error: Error, users: User[];

    [error, users] = await to(this.userModel.find({
      "_id": { "$in": supports.map((a: MicrocreditSupport) => (a.member as Member)._id) }
    }).select({
      "_id": 1, "email": 1, "card": 1
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
      console.log(`\n---------- ---------- ---------- ---------- ---------- ---------- ----------`)
      console.log(`\n#Starting <<Register Failed Transactions>> Scheduled Tasks @${new Date()}... `)
      await this.readPendingRegistrationTransactions();
      await this.readPendingLoyaltyTransactions();
      await this.readPendingCampaigns();
      await this.readPendingMicrocreditPromiseTransactions();
      await this.readPendingMicrocreditTransactions();
      console.log(`<<Register Failed Transactions>> Scheduled Tasks Ended... `)
    });
  }

  public readPendingRegistrationTransactions = async () => {
    let error: Error, transactions: RegistrationTransaction[];
    [error, transactions] = await to(this.registrationTransactionModel.find({
      "status": TransactionStatus.PENDING
    }).populate([{
      "path": 'user'
    }])
      .sort({ "createdAt": 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: RegistrationTransaction) => {
      let transaction: RegistrationTransaction;
      [error, transaction] = await to(registrationTransactionsUtil.updateRegistrationTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    // for (let i = 0; i < transactions.length; i++) {
    //   let transaction: RegistrationTransaction;
    //   [error, transaction] = await to(this.updateRegistrationTransaction(transactions[i]).catch());

    //   if (!error && transaction) completed++;
    // }

    console.log(`${completed} of ${transactions.length} <<User Accounts>> registered in blockchain`);
  }

  public readPendingLoyaltyTransactions = async () => {
    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(this.loyaltyTransactionModel.find({
      "status": TransactionStatus.PENDING
    }).populate([{
      "path": 'partner'
    }, {
      "path": 'member'
    }, {
      "path": 'offer'
    }])
      .sort({ "createdAt": 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: LoyaltyTransaction) => {
      let transaction: LoyaltyTransaction;
      [error, transaction] = await to(loyaltyTransactionsUtil.updateLoyaltyTransaction(item).catch());

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
    [error, campaigns] = await to(this.microcreditCampaignModel.find({
      "registered": TransactionStatus.PENDING
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "createdAt": 1 })
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
    [error, transactions] = await to(this.microcreditTransactionModel.find({
      "$and": [
        { 'status': TransactionStatus.PENDING },
        { 'type': MicrocreditTransactionType.PromiseFund }
      ]
    }).populate({
      "path": 'support',
      "populate": [{
        "path": 'campaign',
        "populate": {
          "path": 'partner'
        }
      }, {
        "path": 'member'
      }]
    })
      .sort({ "createdAt": 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item: MicrocreditTransaction) => {
      let transaction: MicrocreditTransaction;
      [error, transaction] = await to(microcreditTransactionsUtil.updateMicrocreditTransaction(item).catch());

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
    [error, transactions] = await to(this.microcreditTransactionModel.find({
      "$and": [
        { "status": TransactionStatus.PENDING },
        { "type": { "$in": [MicrocreditTransactionType.ReceiveFund, MicrocreditTransactionType.RevertFund, MicrocreditTransactionType.SpendFund] } }
      ]
    }).populate({
      "path": 'support',
      "populate": [{
        "path": 'campaign',
        "populate": {
          "path": 'partner'
        }
      }, {
        "path": 'member'
      }]
    })
      .sort({ "createdAt": 1 })
      .catch());

    let completed = 0;
    transactions.forEach(async (item) => {
      let transaction: MicrocreditTransaction;
      [error, transaction] = await to(microcreditTransactionsUtil.updateMicrocreditTransaction(item).catch());

      if (!error && transaction) completed++;
    });

    console.log(`${completed} of ${transactions.length} <<Microcredit Transactions (Receive, Revert, Spend)>> registered in blockchain`);
  }

  private updateRegisterMicrocreditCampaigns = async (_campaign: MicrocreditCampaign) => {

    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerMicrocreditCampaign(_campaign.partner as Partner, _campaign).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    if (blockchain_result) {
      let error: Error, campaign: MicrocreditCampaign;
      [error, campaign] = await to(this.microcreditCampaignModel.findOneAndUpdate({
        "_id": _campaign._id
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



  public checkBlockchainStatus = () => {
    schedule.scheduleJob(this.repeatEveryBlockchainStatus, async () => {
      console.log(`\n---------- ---------- ---------- ---------- ---------- ---------- ----------`)
      console.log(`\n#Starting <<Check Blockchain Status>> Scheduled Task @${new Date()}... `)
      await this.checkEthereum();
      console.log(`<<Check Blockchain Status>> Scheduled Task Ended... `)
    });
  }

  private checkEthereum = async () => {
    var result: { [key: string]: string | number | unknown } = { date: new Date() };

    const {
      ETH_REMOTE_API,
      ETH_CONTRACTS_PATH,
      ETH_API_ACCOUNT_PRIVKEY,
      ETH_REMOTE_WS,
      ETH_REMOTE_REST,
      ETH_REMOTE_NETWORK_TYPE,
    } = process.env;

    const timeOutPromise = new Promise(function (resolve, reject) {
      setTimeout(() => {
        resolve(false);
      }, 5000);
    });

    let start_time = new Date().getTime(),
      end_time = 0;
    let serviceInstance = null;
    try {
      serviceInstance = new BlockchainService(
        ETH_REMOTE_API,
        path.join(__dirname, ETH_CONTRACTS_PATH),
        ETH_API_ACCOUNT_PRIVKEY
      );
      if (serviceInstance == null) {
        result["ethereum_api_status"] = false;
      } else {
        const status = await Promise.race([
          timeOutPromise,
          serviceInstance.isConnected(),
        ]);

        if (`${process.env.PRODUCTION}` == 'true') {
          const clusterStatus = await Promise.race([
            timeOutPromise,
            serviceInstance.getClusterStatus(),
          ]);

          result = await this.parseClusterStatus(result, clusterStatus);
        }

        result["ethereum_api_up"] = status;
        result["ethereum_api_is_ok"] = await serviceInstance.isOk();
        result["ethereum_api_url"] = ETH_REMOTE_API;
        result["ethereum_api_ws_port"] = Number(ETH_REMOTE_WS);
        result["ethereum_api_rpc_port"] = Number(ETH_REMOTE_REST);
        result["ethereum_api_type"] = ETH_REMOTE_NETWORK_TYPE;
        result["ethereum_api_address"] = serviceInstance.address.from;
        if (status) {
          result[
            "ethereum_loyalty_app_address"
          ] = await serviceInstance.getLoyaltyAppAddress();
          result["ethereum_api_balance"] = parseInt(
            await serviceInstance.getBalance()
          );
        }
      }
    } catch (error) {
      result["ethereum_api_status"] = false;
      console.error("Blockchain connection is limited");
      console.error(error);
    }
    end_time = new Date().getTime();
    result["ethereum_time_to_connect"] = Number(end_time - start_time);

    console.log(result);
    if (result["ethereum_api_status"] == false) {
      let email_error: Error, email_result: any;
      [email_error, email_result] = await to(emailsUtil.notificationBlockchainStatus().catch());
      console.log("email_result");
      console.log(email_result);
      console.log(email_error);
      if (email_error) throw (`EMAIL ERROR - Notification: ${email_error}`);

    }

    return result;
  };


  private parseClusterStatus = async (result: any, status: any) => {
    let node_count = 0,
      node_minter_count = 0;

    for (let index = 0; index < status.length; index++) {
      const node = status[index];
      result[`ethereum_node_${node.raftId}_id`] = node.nodeId;
      result[`ethereum_node_${node.raftId}_role`] = node.role;
      result[`ethereum_node_${node.raftId}_active`] = node.nodeActive;

      if (node.role === "minter") {
        node_count += node.nodeActive ? 1 : 0;
        node_minter_count += 1;
      }
    }

    result[`ethereum_cluster_availability`] =
      (node_count * 100) / node_minter_count;

    return result;
  };
}
export default new Schedule();
