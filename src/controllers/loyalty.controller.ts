import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');
// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnPointsDto from '../loyaltyDtos/earnPoints.dto';
import RedeemPointsDto from '../loyaltyDtos/redeemPoints.dto';
import OfferID from '../loyaltyDtos/offer_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import LoyaltyTransaction from '../loyaltyInterfaces/transaction.interface';
import History from '../loyaltyInterfaces/history.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import usersMiddleware from '../middleware/users.middleware';
import itemsMiddleware from '../middleware/items.middleware';
import checkMiddleware from '../middleware/check.middleware';
import balanceMiddleware from '../middleware/balance.middleware';
import convertHelper from '../middleware/convert.helper';
import OffsetHelper from '../middleware/offset.helper';
// Helper's Instance
const offsetParams = OffsetHelper.offsetLimit;
// Models
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
    this.router.post(`${this.path}/earn/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner, /*accessMiddleware.confirmPassword,*/
      validationBodyMiddleware(EarnPointsDto),
      usersMiddleware.member,
      balanceMiddleware.loyalty_activity,
      this.earnTokens);

    this.router.post(`${this.path}/redeem/:_to`,
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
      this.readStatistics);
    //  this.router.get(`${this.path}/partners_info`, authMiddleware, this.partnersInfoLength);
    //  this.router.get(`${this.path}/transactions_info`, authMiddleware, this.transactionInfoLength);
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
    const _amount = Math.round(data._amount);
    const _points: number = _amount * response.locals.activity.rate;
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const member = response.locals.member;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.earnPoints(_points, member.account.address, _partner, serviceInstance.address)
          .then(async (result: any) => {
            await this.transaction.create({
              ...result,
              partner_id: request.user._id, member_id: member._id,
              type: "EarnPoints",
              data: {
                partner_name: request.user.name, partner_email: request.user.email,
                points: _points, amount: _amount
              },
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
              partner_id: request.user._id, member_id: member._id,
              type: (offer_id === '-1') ? "RedeemPoints" : "RedeemPointsOffer",
              data: {
                partner_name: request.user.name, partner_email: request.user.email,
                points: _points, quantity: data.quantity, offer_id: offer_id, offer_title: offer_title
              }
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
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, transactions: any[];
    [error, transactions] = await to(this.transaction.find({
      $and: [
        { $or: [{ member_id: request.user._id }, { partner_id: request.user._id }] },
        { $or: [{ type: "EarnPoints" }, { type: "RedeemPoints" }, { type: "RedeemPointsOffer" }] }
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

  private readStatistics = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    var _now: number = Date.now();
    var _date = new Date(_now);
    _date.setDate(1);
    _date.setHours(0, 0, 0, 0);
    _date.setMonth(_date.getMonth() - 12);

    let error: Error, statistics: any[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {

        // 'data.offer_id': '5f15818a9f5b970c56c41536'//{ $in: offers.map(a => a.offer_id) }
        $and: [
          { 'partner_id': '5f15922cd2d7ae0f7af14a5c' },
          { 'type': 'EarnPoints' }
        ]
      }
    },
    {
      $group: {
        _id: '$partner_id',
        amount: { $sum: "$data.amount" },
        users: { "$addToSet": "$member_id" },
      }
    },
    {
      "$project": {
        "amount": 1,
        "users": { "$size": "$users" },
        "usersArray": '$users',
        "type": 1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const byDate: any = await this.readDailyStatistics('aek');
    const fullStatistics = statistics.map((a: any) =>
      Object.assign({}, a,
        {
          byDate: ((byDate).find((e: any) => (e._id).toString() === (a._id).toString())).byDate,
        }
      )
    );

    response.status(200).send({
      data: fullStatistics[0],
      code: 200
    });
  }

  private readDailyStatistics = async (status: string) => {

    var _now: number = Date.now();
    var _date = new Date(_now);
    _date.setDate(1);
    _date.setHours(0, 0, 0, 0);
    _date.setMonth(_date.getMonth() - 12);

    let error: Error, statistics: any[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'partner_id': '5f15922cd2d7ae0f7af14a5c' },
          { 'type': 'EarnPoints' }
        ]
      }
    },
    {
      $group: {
        _id: {
          partner_id: '$partner_id',
          date: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
        },
        amount: { $sum: "$data.amount" },
        users: { "$addToSet": "$member_id" }
      }
    },
    {
      $group: {
        _id: "$_id.partner_id",
        byDate: {
          $push: {
            date: "$_id.date", amount: '$amount', users: { "$size": "$users" }, usersArray: '$users'
          }
        }
      }
    },
    {
      "$project": {
        "byDate": { date: 1, amount: 1, users: 1, usersArray: 1 },
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

  // private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   const _member = request.user.account.address;
  //
  //   await serviceInstance.getLoyaltyAppContract()
  //     .then((instance) => {
  //       return instance.members(_member)
  //         .then((results: any) => {
  //           response.status(200).send({
  //             data: {
  //               address: results.memberAddress || null,
  //               points: results.points || 0
  //             },
  //             code: 200
  //           });
  //         })
  //         .catch((error: Error) => {
  //           next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //         })
  //     })
  //     .catch((error) => {
  //       next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     })
  // }
  //
  // private readActivity = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //
  //   const user: User = request.user;
  //
  //   var _now: number = Date.now();
  //   var _date = new Date(_now);
  //   _date.setDate(1);
  //   _date.setHours(0, 0, 0, 0);
  //   _date.setMonth(_date.getMonth() - 12);
  //
  //   let error: Error, history: History[];
  //   [error, history] = await to(this.transaction.aggregate([{
  //     $match: {
  //       $and: [
  //         { 'member_id': (user._id).toString() },//    { 'to_id': (user._id).toString() }, //
  //         { 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
  //         { 'type': "EarnPoints" }
  //       ]
  //     }
  //   },
  //   {
  //     $group: {
  //       _id: '$to_id',
  //       amount: { $sum: "$data.amount" },//  amount: { $sum: "$info.amount" }, //
  //       stores: { "$addToSet": "$partner_id" },//  stores: { "$addToSet": "$from_id" }, //
  //       transactions: { "$addToSet": "$_id" }
  //     }
  //   },
  //   {
  //     "$project": {
  //       "amount": 1,
  //       "stores": { "$size": "$stores" },
  //       "transactions": { "$size": "$transactions" },
  //     }
  //   }]).exec().catch());
  //   if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  //
  //   response.status(200).send({
  //     data: (history.length) ? convertHelper.activityToBagde(history[0]) : convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 }),
  //     code: 200
  //   });
  // }


  // private partnersInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   await serviceInstance.getLoyaltyAppContract()
  //     .then((instance) => {
  //       return instance.partnersInfoLength()
  //         .then((results: any) => {
  //           response.status(200).send({
  //             data: results,
  //             code: 200
  //           });
  //         })
  //         .catch((error: Error) => {
  //           next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //         })
  //     })
  //     .catch((error) => {
  //       next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     })
  // }
  //
  // private transactionInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   await serviceInstance.getLoyaltyAppContract()
  //     .then((instance) => {
  //       return instance.transactionsInfoLength()
  //         .then((results: any) => {
  //           response.status(200).send({
  //             data: results,
  //             code: 200
  //           });
  //         })
  //         .catch((error: Error) => {
  //           next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //         })
  //     })
  //     .catch((error) => {
  //       next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //     })
  // }
