import * as express from 'express';
import to from 'await-to-ts'
// var path = require('path');
// import { ObjectId } from 'mongodb';
import { Parser } from 'json2csv';

// /**
//  * Blockchain Service
//  */
// import { BlockchainService } from '../services/blockchain.service';
// const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// import BlockchainRegistrationService from '../utils/blockchain.util';
// const registrationService = new BlockchainRegistrationService();


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
import { User, LoyaltyStatistics, Member, LoyaltyTransaction, Loyalty, LoyaltyOffer, LoyaltyTransactionType, ExportedLoyaltyStatistics } from '../_interfaces/index';

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
// import convertHelper from '../middleware/items/convert.helper';
// import OffsetHelper from '../middleware/items/offset.helper';
// import blockchainStatus from '../middleware/items/status.middleware';

// /**
//  * Helper's Instance
//  */
// const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import loyaltyModel from '../models/loyalty.model';

/**
 * Transactions Util
 */
import LoyaltyTransactionUtil from '../utils/loyalty.transactions';
const transactionsUtil = new LoyaltyTransactionUtil();

class LoyaltyController implements Controller {
  public path = '/loyalty';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/earn/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationBodyMiddleware(EarnPointsDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_activity,
      this.earnTokens);

    this.router.post(`${this.path}/redeem/:_to`,
      // blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationBodyMiddleware(RedeemPointsDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_balance, checkMiddleware.canRedeemPoints,
      this.redeemTokens);

    this.router.post(`${this.path}/redeem/:partner_id/:offer_id/:_to`,
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

    this.router.get(`${this.path}/statistics/:date`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.readLoyaltyStatistics);

    this.router.get(`${this.path}/statistics/:date/:type/export`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.exportStatistics);
  }

  /** 
   * 
   * Secondary Functions 
   * 
   */

  private dateConvert = (x: string | number | Date) => {
    var today = new Date(x);
    var year = today.getFullYear();
    var month = `0${today.getMonth() + 1}`.slice(-2);
    var day = `0${today.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }

  /**
   * 
   * Main Functions (Route: `/loyalty`)
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

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EarnPointsDto = request.body;

    const partner = request.user;
    const member = response.locals.member;

    const _points: number = Math.round(data._amount) * response.locals.activity.rate;
    // const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;

    let _error: Error, current_loyalty: Loyalty;
    [_error, current_loyalty] = await to(loyaltyModel.findOne({ member: member }).catch());

    let error: Error, loyalty: Loyalty;
    [error, loyalty] = await to(loyaltyModel.updateOne({
      member: member
    }, {
      member: member, currentPoints: (current_loyalty) ? current_loyalty.currentPoints + _points : _points
    }, {
      upsert: true, new: true
    }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createEarnTransaction(partner, member, data, _points).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    response.status(201).send({
      data: 'OK',
      code: 201
    });
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RedeemPointsDto = request.body;

    const partner = request.user;
    const member: User = response.locals.member;

    const offer: LoyaltyOffer = (response.locals.offer) ? response.locals.offer : null;
    const _points = (offer) ? Math.round(data._points) * data.quantity : Math.round(data._points);
    // const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    // const offer_id: OfferID['offer_id'] = request.params.offer_id || '-1';
    // const offer_title = (response.locals.offer) ? response.locals.offer.title : null;

    let _error: Error, current_loyalty: Loyalty;
    [_error, current_loyalty] = await to(loyaltyModel.findOne({ member: member }).catch());

    let error: Error, loyalty: Loyalty;
    [error, loyalty] = await to(loyaltyModel.updateOne(
      {
        member: member
      }, {
      member: member, currentPoints: current_loyalty.currentPoints - _points
    }, { upsert: true, new: true }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let transaction_error: Error, transaction_result: any;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRedeemTransaction(partner, member, offer, data, _points).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    response.status(201).send({
      data: loyalty,
      code: 201
    });
  }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const date = request.params['date'] || '0';
    const { page, size } = request.query;

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(transactionsUtil.readLoyaltyTransactions(user, [LoyaltyTransactionType.EarnPoints, LoyaltyTransactionType.RedeemPoints, LoyaltyTransactionType.RedeemPointsOffer], date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: transactions,
      code: 200
    });
  }

  private readLoyaltyStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const date = request.params['date'];
    const { page, size } = request.query;

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(transactionsUtil.readLoyaltyTransactions(user, [LoyaltyTransactionType.EarnPoints, LoyaltyTransactionType.RedeemPoints], date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    var earn = transactions.filter(s => s.type === LoyaltyTransactionType.EarnPoints);
    var redeem = transactions.filter(s => s.type === LoyaltyTransactionType.RedeemPoints);

    let result: LoyaltyStatistics = {
      earn: {
        points: earn.reduce((accumulator, object) => {
          return accumulator + object.points;
        }, 0),
        amount: earn.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0),
        uniqueUsers: [...new Set(earn.map(item => (item.member as Member).email || (item.member as Member).card))],
        uniqueTransactions: [...new Set(earn.map(item => (item.tx || item._id)))]
      },
      redeem: {
        points: redeem.reduce((accumulator, object) => {
          return accumulator + object.points;
        }, 0),
        amount: redeem.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0),
        uniqueUsers: [...new Set(redeem.map(item => (item.member as Member)?.email || (item.member as Member)?.card))],
        uniqueTransactions: [...new Set(redeem.map(item => (item.tx || item._id)))]
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    response.status(200).send({
      data: result,
      code: 200
    });
  }

  private exportStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const date = request.params['date'];
    const type = request.params['type'] === 'earn' ? LoyaltyTransactionType.EarnPoints : LoyaltyTransactionType.RedeemPoints;
    const { page, size } = request.query;

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(transactionsUtil.readLoyaltyTransactions(user, [type], date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const total = transactions;

    let result: LoyaltyStatistics = {
      total: {
        points: total.reduce((accumulator, object) => {
          return accumulator + object.points;
        }, 0),
        amount: total.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0),
        uniqueUsers: [...new Set(total.map(item => (item.member as Member)?.email || (item.member as Member)?.card))],
        uniqueTransactions: [...new Set(total.map(item => (item.tx || item._id)))]
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    const opts = {
      fields: ['date', 'amount', 'users', 'transactions']
    };

    const json2csvParser = new Parser(opts);
    const csv = json2csvParser.parse([
      ...transactions.map(t => {
        return {
          date: t.createdAt,
          amount: t.amount,
          users: (t.member as Member).email || (t.member as Member).card,
          transactions: t.tx || t._id
        }
      }), {
        date: 'Total',
        amount: result['total'].amount,
        users: result['total'].uniqueUsers.length,
        transactions: result['total'].uniqueTransactions.length
      }] as ExportedLoyaltyStatistics[]);

    try {
      response.attachment(`Statistics-${type}_${(date != '0' ? date : 'total')}.csv`);
      response.status(200).send(csv)
    } catch (error) {
      return next(new UnprocessableEntityException(`EXPORT ERROR || ${error}`));
    }
  }
}

export default LoyaltyController;