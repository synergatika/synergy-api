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
import Activity from '../loyaltyInterfaces/activity.interface';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import LoyaltyTransaction from '../loyaltyInterfaces/transaction.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import customerMiddleware from '../middleware/customer.middleware';
// Models
import userModel from '../models/user.model';
import transactionModel from '../models/loyalty.transaction.model';

class LoyaltyController implements Controller {
  public path = '/loyalty';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/earn`, authMiddleware, /*accessMiddleware.confirmPassword,*//*accessMiddleware.onlyAsMerchant,*/ validationBodyMiddleware(EarnPointsDto), customerMiddleware, this.readActivityByMerchant, this.earnTokens);
    this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, /*accessMiddleware.confirmPassword,*/ validationBodyMiddleware(RedeemPointsDto), customerMiddleware, this.redeemTokens);
    this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance);
    this.router.get(`${this.path}/balance/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readBalanceByMerchant);
    // this.router.get(`${this.path}/badge`, authMiddleware, this.readBadge);
    //this.router.get(`${this.path}/badge/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readBadgeByMerchant);
    this.router.get(`${this.path}/transactions/:offset?`, authMiddleware, this.readTransactions);

    this.router.get(`${this.path}/badge`, authMiddleware, this.readActivity);
    this.router.get(`${this.path}/badge/:_to`, customerMiddleware, this.readActivityByMerchant);


    this.router.get(`${this.path}/partners_info`, authMiddleware, this.partnersInfoLength);
    this.router.get(`${this.path}/transactions_info`, authMiddleware, this.transactionInfoLength);
  }

  // offset: [number, number, number] = [items per page, current page, active or all]
  private offsetParams = (params: string) => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EarnPointsDto = request.body;
    const _amount = Math.round(data._amount);
    const _points: number = _amount * response.locals.activity.rate;
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const customer = response.locals.customer;
    //  console.log(customer._id, typeof (customer._id))
    //  console.log(((customer._id).toString()).substring(0, 4) + "****************" + ((customer._id).toString()).substring(20, 24));
    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.earnPoints(_points, customer.account.address, _partner, serviceInstance.address)
          .then(async (result: any) => {
            await this.transaction.create({
              ...result,

              merchant_id: request.user._id, customer_id: customer._id,
              data: {
                merchant_name: request.user.name, merchant_email: request.user.email,
                points: _points, amount: _amount
              },

              from_id: request.user._id, to_id: customer._id,
              info: {
                from_name: request.user.name, from_email: request.user.email,
                to_email: customer.email,
                points: _points, amount: _amount
              }, type: "EarnPoints"
            });
            response.status(201).send({
              data: result,
              code: 201
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + customer + "/n" + request.user))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + customer + "/n" + request.user))
      })
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RedeemPointsDto = request.body;
    const _points = Math.round(data._points);
    const _partner = '0x' + request.user.account.address; //(serviceInstance.unlockWallet(request.user.account, data.password)).address;
    const customer = response.locals.customer;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.usePoints(_points, customer.account.address, _partner, serviceInstance.address)
          .then(async (result: any) => {

            if (data.offer_id) {
              await this.transaction.create({
                ...result,

                merchant_id: request.user._id, customer_id: customer._id,
                data: {
                  merchant_name: request.user.name, merchant_email: request.user.email,
                  points: _points, offer_id: data.offer_id
                },

                from_id: request.user._id, to_id: customer._id,
                info: {
                  from_name: request.user.name, from_email: request.user.email,
                  to_email: customer.email, points: _points, offer_id: data.offer_id
                }, type: "RedeemPoints"
              });
            } else {
              await this.transaction.create({
                ...result,

                merchant_id: request.user._id, customer_id: customer._id,
                data: {
                  merchant_name: request.user.name, merchant_email: request.user.email,
                  points: data._points, offer_id: data.offer_id
                },

                from_id: request.user._id, to_id: customer._id,
                info: {
                  from_name: request.user.name, from_email: request.user.email,
                  to_email: customer.email, points: data._points, offer_id: data.offer_id
                }, type: "RedeemPointsOffer"
              });
            }
            response.status(201).send({
              data: result,
              code: 201
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      });
  }

  private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const _member = request.user.account.address;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.members(_member)
          .then((results: any) => {
            response.status(200).send({
              data: {
                address: results.address,
                points: results.points
              },
              code: 200
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private readBalanceByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const customer: User = response.locals.customer;

    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.members(customer.account.address)
          .then((results: any) => {
            response.status(200).send({
              data: {
                address: results.address,
                points: results.points
              },
              code: 200
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(this.transaction.find({
      $and: [
        { $or: [{ to_id: request.user._id }, { from_id: request.user._id }] },
        { $or: [{ type: "EarnPoints" }, { type: "RedeemPoints" }, { type: "RedeemPointsOffer" }] }
      ]
    }).select({
      "_id": 1, "type": 1,
      "from_id": 1, "to_id": 1,
      "info": 1, "tx": 1,
      "createdAt": 1
    }).sort('-createdAt')
      .limit(offset.limit).skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: transactions,
      code: 200
    });
  }


  private activityToBagde(activity: Activity): Activity {

    const badge_1: string[] = (`${process.env.BADGE1}`).split("-");
    const badge_2: string[] = (`${process.env.BADGE2}`).split("-");
    const badge_3: string[] = (`${process.env.BADGE3}`).split("-");

    let badge: string, rate: number, slug: number;
    if (activity.amount > parseInt(badge_3[0]) && activity.stores > parseInt(badge_3[1]) && activity.transactions > parseInt(badge_3[2])) {
      slug = 3;
      rate = parseInt(badge_3[3]);
      badge = badge_3[4];
    } else if (activity.amount > parseInt(badge_2[0]) && activity.stores > parseInt(badge_2[1]) && activity.transactions > parseInt(badge_2[2])) {
      slug = 2;
      rate = parseInt(badge_2[3]);
      badge = badge_2[4];
    } else {
      slug = 1;
      rate = parseInt(badge_1[3]);
      badge = badge_1[4];
    }

    return {
      slug: slug,
      amount: activity.amount,
      stores: activity.stores,
      transactions: activity.transactions,
      rate: rate,
      badge: badge
    };
  }

  private readActivityByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const user: User = request.user;

    var _now: number = Date.now();
    var _date = new Date(_now);
    _date.setDate(1);
    _date.setHours(0, 0, 0, 0);
    _date.setMonth(_date.getMonth() - 12);


    let error: Error, activity: Activity[];
    [error, activity] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'to_id': (user._id).toString() },
          { 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
          { 'type': "EarnPoints" }
        ]
      }
    },
    {
      $group: {
        _id: '$to_id',
        amount: { $sum: "$info.amount" },
        stores: { "$addToSet": "$from_id" },
        transactions: { "$addToSet": "$_id" }
      }
    },
    {
      "$project": {
        "amount": 1,
        "stores": { "$size": "$stores" },
        "transactions": { "$size": "$transactions" },
      }
    }]).exec().catch());

    if (error) {
      next(new UnprocessableEntityException('DB ERROR'));
    }
    else if (activity.length) {
      response.locals["activity"] = this.activityToBagde(activity[0]);
    } else {
      response.locals["activity"] = {
        slug: 1,
        amount: 0,
        stores: 0,
        transactions: 0,
        rate: 2,
        badge: 'Supporter'
      }
    }
    next();
  }

  private readActivity = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    const user: User = request.user;

    var _now: number = Date.now();
    var _date = new Date(_now);
    _date.setDate(1);
    _date.setHours(0, 0, 0, 0);
    _date.setMonth(_date.getMonth() - 12);


    let error: Error, activity: any[];
    [error, activity] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'to_id': (user._id).toString() },
          { 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
          { 'type': "EarnPoints" }
        ]
      }
    },
    {
      $group: {
        _id: '$to_id',
        amount: { $sum: "$info.amount" },
        stores: { "$addToSet": "$from_id" },
        transactions: { "$addToSet": "$_id" }
      }
    },
    {
      "$project": {
        "amount": 1,
        "stores": { "$size": "$stores" },
        "transactions": { "$size": "$transactions" },
      }
    }]).exec().catch());

    if (error) {
      next(new UnprocessableEntityException('DB ERROR'));
    }
    else if (activity.length) {
      response.status(200).send({
        data: this.activityToBagde(activity[0]),
        code: 200
      });
    } else {
      response.status(200).send({
        data: {
          slug: 1,
          amount: 0,
          stores: 0,
          transactions: 0,
          rate: 2,
          badge: 'Supporter'
        },
        code: 200
      });
    }
    next();
  }

  private partnersInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.partnersInfoLength()
          .then((results: any) => {
            response.status(200).send({
              data: results,
              code: 200
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }

  private transactionInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    await serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.transactionsInfoLength()
          .then((results: any) => {
            response.status(200).send({
              data: results,
              code: 200
            });
          })
          .catch((error: Error) => {
            next(new UnprocessableEntityException('Blockchain Error'))
          })
      })
      .catch((error) => {
        next(new UnprocessableEntityException('Blockchain Error'))
      })
  }
}

export default LoyaltyController;


// private readBadge = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
//   const _member = request.user.account.address;

//   await serviceInstance.getLoyaltyAppContract()
//     .then((instance) => {
//       return instance.getLoyaltyScore(_member)
//         .then((results: any) => {
//           response.status(200).send({
//             data: {
//               address: _member,
//               points: results
//             },
//             code: 200
//           });
//         })
//         .catch((error: Error) => {
//           next(new UnprocessableEntityException('Blockchain Error'))
//         })
//     })
//     .catch((error) => {
//       next(new UnprocessableEntityException('Blockchain Error'))
//     })
// }

// private readBadgeByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
//   const customer: User = response.locals.customer;

//   await serviceInstance.getLoyaltyAppContract()
//     .then((instance) => {
//       return instance.getLoyaltyScore(customer.account.address)
//         .then((results: any) => {
//           response.status(200).send({
//             data: {
//               address: customer.account.address,
//               points: results
//             },
//             code: 200
//           });
//         })
//         .catch((error: Error) => {
//           next(new UnprocessableEntityException('Blockchain Error'))
//         })
//     })
//     .catch((error) => {
//       next(new UnprocessableEntityException('Blockchain Error'))
//     })
// }
