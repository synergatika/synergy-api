import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
var path = require('path');
import { ObjectId } from 'mongodb';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../../services/blockchain.service';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, History, Loyalty, LoyaltyTransactionType, MicrocreditTransactionType } from '../../_interfaces/index';

/**
 * Middleware
 */
import convertHelper from './convert.helper';

/**
 * Models
 */
import loyaltyTransactionModel from '../../models/loyalty.transaction.model';
import microcreditTransactionModel from '../../models/microcredit.transaction.model';
import supportModel from '../../models/support.model';
import loyaltyModel from '../../models/loyalty.model';

async function loyalty_balance(request: RequestWithUser, response: Response, next: NextFunction) {
  const member: User = (response.locals.member) ? response.locals.member : request.user;

  let error: Error, loyalty: Loyalty;
  [error, loyalty] = await to(loyaltyModel.findOne({
    member: member._id
  }).catch());

  response.locals["balance"] = {
    "_id": member._id,
    "points": loyalty?.currentPoints || 0,
  };

  next();
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
    "$match": {
      "$and": [
        { "member": member._id },
        { "createdAt": { "$gte": new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        { "type": LoyaltyTransactionType.EarnPoints }
      ]
    }
  }, {
    "$group": {
      "_id": "$member_id",
      "amount": { "$sum": "$amount" },
      "stores": { "$addToSet": "$partner_id" },
      "transactions": { "$addToSet": "$_id" }
    }
  }, {
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

  let error: Error, tokens: { member: ObjectId, campaign: ObjectId, tokens: number }[];
  [error, tokens] = await to(supportModel.aggregate([
    {
      "$match": {
        "$and": [{
          "member": member._id
        }, {
          "campaign": campaign._id
        }]
      }
    }, {
      "$project": {
        "_id": "$member",
        "member": 1,
        "tokens": { "$sum": "$initialTokens" }
      }
    }, {
      "$group": {
        "_id": "$member",
        "tokens": { "$sum": "$tokens" },
      }
    }
  ]).exec().catch());

  response.locals["balance"] = {
    "_id": member._id,
    "tokens": tokens.length ? tokens[0]?.tokens : 0,
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
    "$match": {
      "$and": [
        { "member_id": member._id },
        { "createdAt": { "$gte": new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        { "type": MicrocreditTransactionType.PromiseFund }
      ]
    }
  }, {
    "$group": {
      "_id": "$member_id",
      "amount": { "$sum": "$data.tokens" },
      "stores": { "$addToSet": "$partner_id" },
      "transactions": { "$addToSet": "$_id" }
    }
  }, {
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