import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
var path = require('path');
// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import History from '../loyaltyInterfaces/history.interface';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import convertHelper from './convert.helper';
// Models
import transactionModel from '../models/loyalty.transaction.model';

async function balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = response.locals.member;

  await serviceInstance.getLoyaltyAppContract()
    .then((instance) => {
      return instance.members(member.account.address)
        .then((results: any) => {
          response.locals["balance"] = {
            address: results.memberAddress,
            points: results.points,
          };
          next();
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException('Blockchain Error'))
        })
    })
    .catch((error) => {
      next(new UnprocessableEntityException('Blockchain Error'))
    })
}

async function activity(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = response.locals.member;

  var _now: number = Date.now();
  var _date = new Date(_now);
  _date.setDate(1);
  _date.setHours(0, 0, 0, 0);
  _date.setMonth(_date.getMonth() - 12);


  let error: Error, history: History[];
  [error, history] = await to(transactionModel.aggregate([{
    $match: {
      $and: [
        { 'to_id': (member._id).toString() },
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

  if (error) return next(new UnprocessableEntityException('DB ERROR'));

  response.locals["activity"] = (history.length) ? convertHelper.activityToBagde(history[0]) : convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 });
  next();
}

export default {
  balance: balance,
  activity: activity,
}
