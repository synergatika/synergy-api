import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
var path = require('path');
import { ObjectId } from 'mongodb';

// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import Campaign from '../microcreditInterfaces/campaign.interface';
import History from '../loyaltyInterfaces/history.interface';
import Tokens from '../microcreditInterfaces/tokens.interface';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import convertHelper from './convert.helper';
// Models
import userModel from '../models/user.model';
import loyaltyTransactionModel from '../models/loyalty.transaction.model';
import microcreditTransactionModel from '../models/microcredit.transaction.model';

async function loyalty_balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = (response.locals.member) ? response.locals.member : request.user;

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
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
        })
    })
    .catch((error) => {
      next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
    })
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
      amount: { $sum: "$data.amount" },
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

  response.locals["activity"] = (history.length) ? convertHelper.activityToBagde(history[0]) : convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 });
  next();
}

async function microcredit_balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const campaign: Campaign = response.locals.campaign;
  const member: User = (response.locals.member) ? response.locals.member : request.user;

  let error: Error, tokens: Tokens[];
  [error, tokens] = await to(userModel.aggregate([{
    $unwind: '$microcredit'
  }, {
    $unwind: '$microcredit.supports'
  }, {
    $match: {
      $and: [
        { 'microcredit._id': new ObjectId(campaign.campaign_id) },
        { 'microcredit.supports.backer_id': (member._id).toString() }
      ]
    }
  }, {
    "$group": {
      '_id': '$microcredit._id',
      'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
      'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
    }
  }]).exec().catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["backerTokens"] = {
    '_id': tokens.length ? tokens[0]._id : campaign.campaign_id,
    'initialTokens': tokens.length ? tokens[0].initialTokens : '0',
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

  response.status(200).send({
    data: (history.length) ? convertHelper.activityToBagde(history[0]) : convertHelper.activityToBagde({ amount: 0, stores: 0, transactions: 0 }),
    code: 200
  });
}

export default {
  loyalty_balance: loyalty_balance,
  loyalty_activity: loyalty_activity,
  microcredit_balance: microcredit_balance,
  microcredit_activity: microcredit_activity
}
