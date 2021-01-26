import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * DTOs
 */
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnPointsDto from '../loyaltyDtos/earnPoints.dto';
import RedeemPointsDto from '../loyaltyDtos/redeemPoints.dto';
import OfferID from '../loyaltyDtos/offer_id.params.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import LoyaltyTransaction from '../loyaltyInterfaces/transaction.interface';
import History from '../loyaltyInterfaces/history.interface';
import LoyaltyStatistics from '../loyaltyInterfaces/loyaltyStatistics.interface';

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
import userModel from '../models/user.model';
import transactionModel from '../models/loyalty.transaction.model';
import Offer from 'loyaltyInterfaces/offer.interface';

class LoyaltyController implements Controller {
  public path = '/loyalty';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

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
      validationParamsMiddleware(IdentifierDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_balance,
      this.readBalance);

    this.router.get(`${this.path}/badge`,
      authMiddleware,
      balanceMiddleware.loyalty_activity,
      this.readActivity);

    this.router.get(`${this.path}/badge/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(IdentifierDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_activity,
      this.readActivity);

    this.router.get(`${this.path}/statistics`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.readLoyaltyStatistics);
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
    const data: EarnPointsDto = request.body;
    const _points: number = Math.round(data._amount) * response.locals.activity.rate;
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const member = response.locals.member;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.earnPoints(_points, member.account.address, _partner, serviceInstance.address)
          .then(async (result: any) => {
            await this.transaction.create({
              ...result,
              partner_id: request.user._id,
              partner_name: request.user.name,

              member_id: member._id,

              points: _points,
              amount: data._amount,

              type: "EarnPoints",
            });
            response.status(201).send({
              data: result,
              code: 201
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + member + "/n" + request.user))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + member + "/n" + request.user))
      })
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RedeemPointsDto = request.body;
    const _points = Math.round(data._points);
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const member: User = response.locals.member;
    const offer_id: OfferID['offer_id'] = request.params.offer_id || '-1';
    const offer_title = (response.locals.offer) ? response.locals.offer.title : null;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.usePoints(_points, member.account.address, _partner, serviceInstance.address)
          .then(async (result: any) => {

            await this.transaction.create({
              ...result,
              partner_id: request.user._id,
              partner_name: request.user.name,

              member_id: member._id,

              offer_id: offer_id,
              offer_title: offer_title,
              quantity: data.quantity,

              points: _points,
              amount: (data._amount) ? (data._amount) * (-1) : 0,

              type: (offer_id === '-1') ? "RedeemPoints" : "RedeemPointsOffer",
            });
            response.status(201).send({
              data: result,
              code: 201
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
      });
  }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, transactions: any[];
    [error, transactions] = await to(this.transaction.find({
      $and: [
        { $or: [{ member_id: request.user._id }, { partner_id: request.user._id }] },
        { $or: [{ type: "EarnPoints" }, { type: "RedeemPoints" }, { type: "RedeemPointsOffer" }] }
      ]
    }).select({
      "_id": 1,

      "partner_id": 1,
      "partner_name": 1,

      "member_id": 1,

      "points": 1,
      "amount": 1,

      "offer_id": 1,
      "offer_title": 1,
      "quantity": 1,

      "type": 1,

      "tx": 1,
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

  private readLoyaltyStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

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
    [error, statistics] = await to(this.transaction.aggregate([{
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
    [error, statistics] = await to(this.transaction.aggregate([{
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
