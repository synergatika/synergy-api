import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');
import { ObjectId } from 'mongodb';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

import BlockchainRegistrationService from '../utils/blockchain.registrations';
const registrationService = new BlockchainRegistrationService();


/**
 * DTOs
 */
import { IdentifierToDto, EarnPointsDto, RedeemPointsDto, OfferID } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, LoyaltyStatistics, Partner, Member, LoyaltyTransaction, Loyalty, LoyaltyOffer, TransactionStatus, LoyaltyTransactionType } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
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
import loyaltyModel from '../models/loyalty.model';
import transactionModel from '../models/loyalty.transaction.model';

class LoyaltyController implements Controller {
  public path = '/loyalty';
  public router = express.Router();
  private transactionModel = transactionModel;
  private loyaltyModel = loyaltyModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/earn/:_to`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationBodyMiddleware(EarnPointsDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_activity,
      this.earnTokens);

    this.router.post(`${this.path}/redeem/:_to`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationBodyMiddleware(RedeemPointsDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_balance, checkMiddleware.canRedeemPoints,
      this.redeemTokens);

    this.router.post(`${this.path}/redeem/:partner_id/:offer_id/:_to`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationParamsMiddleware(OfferID),
      accessMiddleware.belongsTo,
      validationBodyMiddleware(RedeemPointsDto),
      usersMiddleware.member,
      itemsMiddleware.offerMiddleware,
      balanceMiddleware.loyalty_balance, checkMiddleware.canRedeemOffer,
      this.redeemTokens);

    this.router.get(`${this.path}/transactions/:offset`,
      authMiddleware,
      this.readTransactions);

    this.router.get(`${this.path}/balance`,
      authMiddleware,
      balanceMiddleware.loyalty_balance,
      this.readBalance);
    this.router.get(`${this.path}/balance/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(IdentifierToDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_balance,
      this.readBalance);

    this.router.get(`${this.path}/badge`,
      authMiddleware,
      balanceMiddleware.loyalty_activity,
      this.readActivity);

    this.router.get(`${this.path}/badge/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(IdentifierToDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_activity,
      this.readActivity);

    this.router.get(`${this.path}/statistics`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.readLoyaltyStatistics);

    // this.router.get(`${this.path}/statistics2/test/:id`,
    //   // authMiddleware, accessMiddleware.onlyAsPartner,
    //   this.readLoyaltyStatistics2);
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

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EarnPointsDto = request.body;
    const _points: number = Math.round(data._amount) * response.locals.activity.rate;
    const partner = request.user;
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const member = response.locals.member;

    let _error: Error, current_loyalty: Loyalty;
    [_error, current_loyalty] = await to(this.loyaltyModel.findOne({ member: member }).catch());

    let error: Error, loyalty: Loyalty;
    [error, loyalty] = await to(this.loyaltyModel.updateOne(
      {
        member: member
      },
      // {
      // $setOnInsert: 
      { member: member, currentPoints: (current_loyalty) ? current_loyalty.currentPoints + _points : _points }
      // }
      ,
      { upsert: true, new: true }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createEarnTransaction(partner, member, data, _points).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    response.status(201).send({
      data: 'OK',
      code: 201
    });
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RedeemPointsDto = request.body;
    const partner = request.user;
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const member: User = response.locals.member;
    const offer: LoyaltyOffer = (response.locals.offer) ? response.locals.offer : null;
    const _points = (offer) ? Math.round(data._points) * data.quantity : Math.round(data._points);
    const offer_id: OfferID['offer_id'] = request.params.offer_id || '-1';
    const offer_title = (response.locals.offer) ? response.locals.offer.title : null;

    let _error: Error, current_loyalty: Loyalty;
    [_error, current_loyalty] = await to(this.loyaltyModel.findOne({ member: member }).catch());

    let error: Error, loyalty: Loyalty;
    [error, loyalty] = await to(this.loyaltyModel.updateOne(
      {
        member: member
      },
      // {
      // $setOnInsert: 
      { member: member, currentPoints: current_loyalty.currentPoints - _points }
      // }
      ,
      { upsert: true, new: true }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(this.createRedeemTransaction(partner, member, offer, data, _points).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    response.status(201).send({
      data: 'OK',
      code: 201
    });
  }

  /**
   * 
   * Loyalty Transactions Functions (readTransactions, createEarnTransaction, createRedeemTransaction)
   * 
   */

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, transactions: any[];
    [error, transactions] = await to(this.transactionModel.find({
      $and: [
        { $or: [{ member_id: request.user._id.toString() }, { partner_id: request.user._id.toString() }] },
        { $or: [{ type: LoyaltyTransactionType.EarnPoints }, { type: LoyaltyTransactionType.RedeemPoints }, { type: LoyaltyTransactionType.RedeemPointsOffer }] }
      ]
    })
      .populate({
        path: 'partner'
      })
      //.select({
      //   "_id": 1,

      //   "partner_id": 1,
      //   "partner_name": 1,

      //   "member_id": 1,

      //   "points": 1,
      //   "amount": 1,

      //   "offer_id": 1,
      //   "offer_title": 1,
      //   "quantity": 1,

      //   "type": 1,

      //   "tx": 1,
      //   "createdAt": 1
      // })
      .sort('-createdAt')
      .limit(offset.limit).skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: transactions,
      code: 200
    });
  }

  private createEarnTransaction = async (partner: User, member: User, data: EarnPointsDto, _points: number) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerEarnLoyalty(partner, member, _points).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: any;
    // [error, transaction] = 
    return await
      //await to(
      this.transactionModel.create({
        ...blockchain_result,
        partner: partner,
        member: member,
        data: data,

        /** begin: To be Removed in Next Version */
        partner_id: partner._id,
        partner_name: partner.name,
        member_id: member._id,
        /** end: To be Removed in Next Version */

        points: _points,
        amount: data._amount,

        status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        type: LoyaltyTransactionType.EarnPoints,
      })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  private createRedeemTransaction = async (partner: User, member: User, offer: LoyaltyOffer, data: RedeemPointsDto, _points: number) => {
    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerRedeemLoyalty(partner, member, _points).catch());
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    // let error: Error, transaction: LoyaltyTransaction;
    // [error, transaction] = await to(
    return await this.transactionModel.create({
      partner: partner,
      member: member,
      offer: offer,
      data: data,

      ...blockchain_result,

      /** begin: To be Removed in Next Version */
      partner_id: partner._id,
      partner_name: partner.name,
      member_id: member._id,
      offer_id: (offer) ? offer._id : null,
      offer_title: (offer) ? offer.title : null,
      quantity: data.quantity,
      /** end: To be Removed in Next Version */

      points: _points * (-1),
      amount: (data._amount) ? (data._amount) * (-1) : 0,

      status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      type: (offer) ? LoyaltyTransactionType.RedeemPointsOffer : LoyaltyTransactionType.RedeemPoints,
    })
    // .catch());
    // if (error) return error;

    // return blockchain_result;
  }

  /**
   * 
   * Blockchain Register Functions (registerEarnLoyalty, registerRedeemLoyalty)
   * 
   */

  // private registerEarnLoyalty = async (partner: User, member: User, _points: number) => {
  //   return await to(serviceInstance.getLoyaltyAppContract()
  //     .then((instance) => {
  //       return instance.earnPoints(_points, member.account.address, '0x' + partner.account.address, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error;
  //     })
  //   );
  // }

  // private registerRedeemLoyalty = async (partner: User, member: User, _points: number) => {
  //   return await to(serviceInstance.getLoyaltyAppContract()
  //     .then((instance) => {
  //       return instance.usePoints(_points, member.account.address, '0x' + partner.account.address, serviceInstance.address)
  //     })
  //     .catch((error) => {
  //       return error;
  //     })
  //   );
  // }

  /**
   * 
   * Loyalty Statistics
   * 
   */
  dateConvert = (x: string | number | Date) => {
    var today = new Date(x);
    var year = today.getFullYear();
    var month = `0${today.getMonth() + 1}`.slice(0, 2);
    var day = `0${today.getDate()}`.slice(0, 2);
    return `${year}-${month}-${day}`;
  }

  private readLoyaltyStatistics2 = async (partner_id: string) => {

    let error: Error, statistics: any[];
    [error, statistics] = await to(this.transactionModel.find(
      {
        "$and": [
          { partner: new ObjectId(partner_id) },
          { type: { "$in": [LoyaltyTransactionType.EarnPoints, LoyaltyTransactionType.RedeemPoints] } }
        ]
      }
    ).populate({
      "path": "member"
    }).sort('createdAt').catch());

    var _total: { earn: { points: number, amount: number }, redeem: { points: number, amount: number }, uniqueUsers: string[], uniqueTransactions: string[] }
      = { earn: { points: 0, amount: 0 }, redeem: { points: 0, amount: 0 }, uniqueUsers: [], uniqueTransactions: [] };
    var _daily: { earn: { points: 0, amount: 0 }, redeem: { points: number, amount: number }, uniqueUsers: string[], uniqueTransactions: string[], createdAt: string }[]
      = [];

    statistics.map(o => {
      return { ...o, member: o.member._id, transaction: o._id, type: o.type, points: o.points, amount: o.amount, createdAt: this.dateConvert(o.createdAt) }
    }).forEach(element => {
      /** Total */
      if (_total.uniqueUsers.findIndex(i => i === element.member) < 0) {
        _total.uniqueUsers.push(element.member);
      }

      if (_total.uniqueTransactions.findIndex(i => i === element.transaction) < 0) {
        _total.uniqueTransactions.push(element.transaction);
      }

      switch (element.type) {
        case (LoyaltyTransactionType.EarnPoints):
          _total.earn.points += element.points;
          _total.earn.amount += element.amount;
          break;
        case (LoyaltyTransactionType.RedeemPoints):
          _total.redeem.points += element.points;
          _total.redeem.amount += element.amount;
          break;
      }

      /** Daily */
      if (_daily.findIndex(i => i.createdAt === element.createdAt) < 0)
        _daily.push({ createdAt: element.createdAt, earn: { points: 0, amount: 0 }, redeem: { points: 0, amount: 0 }, uniqueUsers: [], uniqueTransactions: [] })

      if (_daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.findIndex(i => i === element.member) < 0) {
        _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.push(element.member);
      }

      if (_daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.findIndex(i => i === element.transaction) < 0) {
        _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.push(element.transaction);
      }

      switch (element.type) {
        case (LoyaltyTransactionType.EarnPoints):
          _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].earn.points += element.points;
          _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].earn.amount += element.amount;
          return;
        case (LoyaltyTransactionType.RedeemPoints):
          _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].redeem.points += element.points;
          _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].redeem.amount += element.amount;
          return;
      }
    });
    // /** Total */
    // var result_: { earn: number, redeem: number, uniqueUsers: string[], uniqueTransactions: string[] } = { earn: 0, redeem: 0, uniqueUsers: [], uniqueTransactions: [] };
    // statistics.map(o => { return { ...o, type: o.type, points: o.points, amount: o.amount, createdAt: this.dateConvert(o.createdAt) } }).forEach(element => {
    //   switch (element.type) {
    //     case (LoyaltyTransactionType.EarnPoints):
    //       result_.earn += element.points;
    //       return;
    //     case (LoyaltyTransactionType.RedeemPoints):
    //       result_.redeem += element.points;
    //       return;
    //   }
    // });
    // result_.uniqueUsers = [...new Set(statistics.map(item => item.member._id))];
    // result_.uniqueTransactions = [...new Set(statistics.map(item => item._id))];

    // console.log(result_)

    // var result: { createdAt: string, earn: number, redeem: number, uniqueUsers: string[], uniqueTransactions: string[] }[] = [];
    // statistics.map(o => { return { ...o, member: o.member._id, transaction: o._id, type: o.type, amount: o.ammount, points: o.points, createdAt: this.dateConvert(o.createdAt) } }).forEach(element => {
    //   if (result.findIndex(i => i.createdAt === element.createdAt) < 0)
    //     result.push({ createdAt: element.createdAt, earn: 0, redeem: 0, uniqueUsers: [], uniqueTransactions: [] })

    //   if (result[result.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.findIndex(i => i === element.member) < 0) {
    //     result[result.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.push(element.member);
    //   }

    //   if (result[result.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.findIndex(i => i === element.transaction) < 0) {
    //     result[result.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.push(element.transaction);
    //   }

    //   switch (element.type) {
    //     case (LoyaltyTransactionType.EarnPoints):
    //       result[result.findIndex(i => i.createdAt === element.createdAt)].earn += element.points;
    //       return;
    //     case (LoyaltyTransactionType.RedeemPoints):
    //       result[result.findIndex(i => i.createdAt === element.createdAt)].redeem += element.points;
    //       return;
    //   }
    // });
    // console.log(result)
    return { _total, _daily };
    // response.status(200).send({
    //   data: {
    //     _total, _daily
    //   },
    //   code: 200
    // });
  }

  private readLoyaltyStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    var x = await this.readLoyaltyStatistics2((user._id).toString())
    console.log("Read Loyalty - New Statistics");
    console.log(x);

    const statisticsEarn: LoyaltyStatistics[] = await this.readStatistics((user._id).toString(), 'EarnPoints');
    const statisticsRedeem: LoyaltyStatistics[] = await this.readStatistics((user._id).toString(), 'RedeemPoints');

    response.status(200).send({
      data: {
        statisticsEarn: statisticsEarn[0],
        statisticsRedeem: statisticsRedeem[0]
      },
      code: 200
    });
  }

  private readStatistics = async (partner_id: string, status: string) => {

    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transactionModel.aggregate([{
      $match: {
        $and: [
          { 'partner_id': partner_id },
          { 'type': status }
        ]
      }
    },
    {
      $group: {
        _id: '$partner_id',
        amount: { $sum: "$amount" },
        points: { $sum: "$points" },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      "$project": {
        "amount": 1,
        "points": 1,
        "users": { "$size": "$users" },
        "usersArray": '$users',
        "count": { "$size": "$count" }
      }
    }
    ]).exec().catch());
    if (error) return [];

    const byDate: LoyaltyStatistics[] = await this.readDailyStatistics(partner_id, status);
    const fullStatistics = statistics.map((a: LoyaltyStatistics) =>
      Object.assign({}, a,
        {
          byDate: ((byDate).find((e: LoyaltyStatistics) => (e._id).toString() === (a._id).toString())).byDate,
        }
      )
    );

    return fullStatistics;
  }

  private readDailyStatistics = async (partner_id: string, status: string) => {

    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transactionModel.aggregate([{
      $match: {
        $and: [
          { 'partner_id': partner_id },
          { 'type': status }
        ]
      }
    },
    {
      $group: {
        _id: {
          partner_id: '$partner_id',
          date: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
        },
        amount: { $sum: "$amount" },
        points: { $sum: "$points" },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      $group: {
        _id: "$_id.partner_id",
        byDate: {
          $push: {
            date: "$_id.date", amount: '$amount', points: '$points', users: { "$size": "$users" }, usersArray: '$users', count: { "$size": "$count" }
          }
        }
      }
    },
    {
      "$project": {
        "byDate": { date: 1, amount: 1, points: 1, users: 1, usersArray: 1, count: 1 },
      }
    }
    ]).exec().catch());
    if (error) return [];

    statistics.forEach((element: any) => {
      element.byDate.forEach((element: any) => {
        element.date = (element.date.year).toString() + "/" + ("0" + (element.date.month).toString()).slice(-2) + "/" + ("0" + (element.date.day).toString()).slice(-2);
      });
    });

    return statistics;
  }
}

export default LoyaltyController;


  // private escapeBlockchainError = async (_error: any, _type: string) => {
  //   await this.failedTransactionModel.create({
  //     error: _error,
  //     type: _type
  //   })
  // }
// let error: Error, result: any;
    // [error, result] = await to(serviceInstance.getLoyaltyAppContract()
    //   .then((instance) => {
    //     return instance.usePoints(_points, member.account.address, _partner, serviceInstance.address)
    //   })
    //   .catch((error) => {
    //     return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //   })
    // );
    // if (error) {
    //   this.escapeBlockchainError(error, (offer_id === '-1') ? "RedeemPoints" : "RedeemPointsOffer",)
    //   return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    // }

    // await this.transaction.create({
    //   ...result,
    //   partner_id: request.user._id,
    //   partner_name: request.user.name,

    //   member_id: member._id,

    //   offer_id: offer_id,
    //   offer_title: offer_title,
    //   quantity: data.quantity,

    //   points: _points,
    //   amount: (data._amount) ? (data._amount) * (-1) : 0,

    //   type: (offer_id === '-1') ? "RedeemPoints" : "RedeemPointsOffer",
    // });

    // await serviceInstance.getLoyaltyAppContract()
    //   .then((instance) => {
    //     return instance.usePoints(_points, member.account.address, _partner, serviceInstance.address)
    //       .then(async (result: any) => {

    //         await this.transaction.create({
    //           ...result,
    //           partner_id: request.user._id,
    //           partner_name: request.user.name,

    //           member_id: member._id,

    //           offer_id: offer_id,
    //           offer_title: offer_title,
    //           quantity: data.quantity,

    //           points: _points,
    //           amount: (data._amount) ? (data._amount) * (-1) : 0,

    //           type: (offer_id === '-1') ? "RedeemPoints" : "RedeemPointsOffer",
    //         });
    //         response.status(201).send({
    //           data: result,
    //           code: 201
    //         });
    //       })
    //       .catch((error: Error) => {
    //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
    //       })
    //   })
    //   .catch((error) => {
    //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
    //   });

      // let error: Error, result: any;
    // [error, result] = await to(serviceInstance.getLoyaltyAppContract()
    //   .then((instance) => {
    //     return instance.earnPoints(_points, member.account.address, _partner, serviceInstance.address)
    //   })
    //   .catch((error) => {
    //     return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //   })
    // );
    // if (error) {
    //   this.escapeBlockchainError(error, "EarnPoints")
    //   return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    // }

    // await this.transaction.create({
    //   ...result,
    //   partner_id: request.user._id,
    //   partner_name: request.user.name,

    //   member_id: member._id,

    //   points: _points,
    //   amount: data._amount,

    //   type: "EarnPoints",
    // });

    // await serviceInstance.getLoyaltyAppContract()
    //   .then((instance) => {
    //     return instance.earnPoints(_points, member.account.address, _partner, serviceInstance.address)
    //       .then(async (result: any) => {
    //         await this.transaction.create({
    //           ...result,
    //           partner_id: request.user._id,
    //           partner_name: request.user.name,

    //           member_id: member._id,

    //           points: _points,
    //           amount: data._amount,

    //           type: "EarnPoints",
    //         });
    //         response.status(201).send({
    //           data: result,
    //           code: 201
    //         });
    //       })
    //       .catch((error: Error) => {
    //         next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + member + "/n" + request.user))
    //       })
    //   })
    //   .catch((error) => {
    //     next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + member + "/n" + request.user))
    //   })