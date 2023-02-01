import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
var path = require('path');
import { ObjectId } from 'mongodb';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, History, MicrocreditTokens } from '../../_interfaces/index';

/**
 * Middleware
 */
import convertHelper from './convert.helper';

/**
 * Models
 */
import loyaltyTransactionModel from '../../models/loyalty.transaction.model';
import microcreditTransactionModel from '../../models/microcredit.transaction.model';

async function loyalty_balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = (response.locals.member) ? response.locals.member : request.user;

  let error: Error, points: any[];
  [error, points] = await to(loyaltyTransactionModel.aggregate([{
    $match: {
      $and: [{
        'member_id': (member._id).toString()
      }]
    }
  },
  {
    $group: {
      _id: "$member_id",
      member_id: { '$first': '$member_id' },
      currentPoints: { $sum: '$points' }
    }
  }]
  ).exec().catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["balance"] = {
    address: points[0].member_id,
    points: points[0].currentPoints,
  };
  next();


  // const member: User = (response.locals.member) ? response.locals.member : request.user;

  // let error: Error, result: any;
  // [error, result] = await to(serviceInstance.getLoyaltyAppContract()
  //   .then((instance) => {
  //     return instance.members(member.account.address)
  //   })
  //   .catch((error) => {
  //     return error; //next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   })
  // );
  // if (error) return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))

  // response.locals["balance"] = {
  //   address: result.memberAddress,
  //   points: result.points,
  // };
  // next();
  // await serviceInstance.getLoyaltyAppContract()
  //   .then((instance) => {
  //     return instance.members(member.account.address)
  //       .then((results: any) => {
  //         response.locals["balance"] = {
  //           address: results.memberAddress,
  //           points: results.points,
  //         };
  //         next();
  //       })
  //       .catch((error: Error) => {
  //         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //       })
  //   })
  //   .catch((error) => {
  //     next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
  //   })
}

async function loyalty_activity(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = (response.locals.member) ? response.locals.member : request.user;

  var _now: number = Date.now();
  var _date = new Date(_now);
  _date.setDate(1);
  _date.setHours(0, 0, 0, 0);
  _date.setMonth(_date.getMonth() - 12);


  let error: Error, history: History[];
  [error, history] = await to(loyaltyTransactionModel.aggregate([{
    $match: {
      $and: [
        { 'member_id': (member._id).toString() },
        { 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        { 'type': "EarnPoints" }
      ]
    }
  },
  {
    $group: {
      _id: '$member_id',
      amount: { $sum: "$amount" },
      stores: { "$addToSet": "$partner_id" },
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

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["activity"] = (history.length) ?
    convertHelper.activityToBagde(history[0]) :
    convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 });
  next();
}

async function microcredit_balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const campaign: MicrocreditCampaign = response.locals.campaign;
  const member: User = response.locals.member;

  let error: Error, tokens: MicrocreditTokens[];
  [error, tokens] = await to(microcreditTransactionModel.aggregate(
    [
      {
        $match: {
          $and: [{
            'member_id': (member._id).toString()
          }, {
            'campaign_id': (campaign._id).toString()
          }]
        }
      }, {
        $project: {
          _id: "$campaign_id",
          campaign_id: 1,
          earned: { $cond: [{ $eq: ['$type', 'PromiseFund'] }, '$tokens', 0] },
          redeemed: { $cond: [{ $eq: ['$type', 'ReceiveFund'] }, '$tokens', 0] }
        }
      },
      {
        $group: {
          _id: "$campaign_id",
          earnedTokens: { $sum: '$earned' },
          redeemedTokens: { $sum: '$redeemed' }
        }
      }]
  ).exec().catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["balance"] = {
    '_id': campaign._id,
    'earnedTokens': tokens.length ? tokens[0].earnedTokens : '0',
    'redeemedTokens': tokens.length ? tokens[0].redeemedTokens : '0'
  };
  next();
}

async function microcredit_activity(request: RequestWithUser, response: Response, next: NextFunction) {

  const member: User = (response.locals.member) ? response.locals.member : request.user;

  var _now: number = Date.now();
  var _date = new Date(_now);
  _date.setDate(1);
  _date.setHours(0, 0, 0, 0);
  _date.setMonth(_date.getMonth() - 12);

  let error: Error, history: History[];
  [error, history] = await to(microcreditTransactionModel.aggregate([{
    $match: {
      $and: [
        { 'member_id': (member._id).toString() },
        { 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        { 'type': "PromiseFund" }
      ]
    }
  },
  {
    $group: {
      _id: '$member_id',
      amount: { $sum: "$data.tokens" },
      stores: { "$addToSet": "$partner_id" },
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

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["activity"] = (history.length) ?
    convertHelper.activityToBagde(history[0]) :
    convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 });

  next();
}

export default {
  loyalty_balance: loyalty_balance,
  loyalty_activity: loyalty_activity,
  microcredit_balance: microcredit_balance,
  microcredit_activity: microcredit_activity
}
