

import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
var path = require('path');

/**
 * DTOs
 */
import PartnerID from '../usersDtos/partner_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import SupportID from '../microcreditDtos/support_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
import MicrocreditTransaction from '../microcreditInterfaces/transaction.interface';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import usersMiddleware from '../middleware/items/users.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';


class MicrocreditSupportsController implements Controller {
  public path = '/microcredit/supports';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:offset`, authMiddleware, this.readAllBackerSupports);
    // this.router.get(`${this.path}/balance/balance/:partner_id`, authMiddleware, this.__balance);

    this.router.get(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      this.readAllSupportsByCampaign);

    this.router.get(`${this.path}/:partner_id/:campaign_id/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      validationParamsMiddleware(IdentifierDto), usersMiddleware.member,
      this.readBackerSupportsByCampaign);

    // this.router.get(`${this.path}/check/:partner_id/:support_id`, this.check);
  }

  // private check = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   const partner_id: SupportID["partner_id"] = request.params.partner_id;
  //   const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  //   const support_id: SupportID["support_id"] = request.params.support_id;
  //
  //   let error: Error, supports: Support[];
  //   [error, supports] = await to(this.transaction.aggregate(
  //     [
  //       {
  //         $match: {
  //           $and: [
  //             { 'partner_id': partner_id },
  //             // { 'campaign_id': campaign_id },
  //             { 'support_id': support_id }
  //           ]
  //         }
  //       },
  //       { $sort: { date: 1 } },
  //       {
  //         $group:
  //         {
  //           _id: "$support_id",
  //
  //           partner_id: { '$first': "$partner_id" },
  //           member_id: { '$first': "$member_id" },
  //
  //           // campaign_id: { '$first': "$campaign_id" },
  //           payment_id: { '$first': "$payment_id" },
  //           method: { '$first': "$method" },
  //           status: { '$last': "$type" },
  //
  //           address: { '$first': "$address" },
  //           // contractRef: { '$first': "$contractRef" },
  //           contractIndex: { '$first': "$contractIndex" },
  //
  //           currentTokens: { '$sum': '$tokens' },
  //           initialTokens: { '$first': "$tokens" },
  //
  //           createdAt: { '$first': "$createdAt" },
  //           updatedAt: { '$last': "$createdAt" },
  //         }
  //       }
  //     ]
  //   ).exec());
  //   if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  //
  //   response.locals["support"] = { ...supports[0], support_id: supports[0]._id, _id: undefined };
  //
  //   response.status(200).send({
  //     data: response.locals["support"],
  //     code: 200
  //   });
  // }
  // private __balance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   const partner_id: CampaignID["partner_id"] = request.params.partner_id;
  //
  //   let error: Error, supports: any[];
  //   [error, supports] = await to(this.transaction.aggregate(
  //     [
  //       {
  //         //   $match: {
  //         //     // $and: [{
  //         //     member_id: (memeber._id).toString()
  //         //     // }, {
  //         //     //   'microcredit_id': campaign_id
  //         //     // }]
  //         //   }
  //         // }, {
  //         $project: {
  //           _id: partner_id,
  //           partner_id: 1,
  //           earned: { $cond: [{ $eq: ['$type', 'PromiseFund'] }, '$tokens', 0] },
  //           redeemed: { $cond: [{ $eq: ['$type', 'ReceiveFund'] }, '$tokens', 0] }
  //         }
  //       },
  //       {
  //         $group: {
  //           _id: "$partner_id",
  //           earnedTokens: { $sum: '$earned' },
  //           redeemedTokens: { $sum: '$redeemed' }
  //         }
  //       }]
  //   ).exec().catch());
  //   if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  //   response.status(200).send({
  //     data: supports,
  //     code: 200
  //   });
  // }


  private defineSupportStatus(a: any) {
    if (a.currentTokens == 0) return 'completed';
    else if (a.type == 'PromiseFund' || a.type == 'RevertFund') return 'unpaid';
    else if (a.type == 'ReceiveFund' || a.type == 'SpendFund') return 'paid';
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, supports: any[];
    [error, supports] = await to(this.transaction.aggregate([
      {
        $match: {
          'member_id': (user._id).toString()
        }
      },
      { $sort: { date: 1 } },
      {
        $group:
        {
          _id: "$support_id",
          campaign_id: { '$first': "$campaign_id" },
          initialTokens: { '$first': "$tokens" },
          currentTokens: { '$sum': '$tokens' },
          method: { '$first': "$method" },
          payment_id: { '$first': "$payment_id" },
          type: { '$last': "$type" },
          createdAt: { '$first': "$createdAt" },
        }
      }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    console.log(supports)
    const campaigns: Campaign[] = await this.readCampaigns(supports);
    console.log(campaigns)

    const supportsWithCampaign = supports.map((a: Support) =>
      Object.assign({}, a,
        {
          status: this.defineSupportStatus(a),
          campaign: (campaigns).find((b: Campaign) => (b.campaign_id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    console.log(supportsWithCampaign);
    response.status(200).send({
      data: supportsWithCampaign,
      code: 200
    });

    // let error: Error, supports: any[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    // [error, supports] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $unwind: '$microcredit.supports'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'microcredit.supports.backer_id': (user._id).toString() },
    //       { 'microcredit.redeemEnds': { $gt: offset.greater } },
    //       { $expr: { $gt: ["$microcredit.supports.initialTokens", (offset.greater > 0) ? "$microcredit.supports.redeemedTokens" : 0] } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     _id: false,
    //     partner_id: '$_id',
    //     partner_slug: '$slug',
    //     partner_name: '$name',
    //     partner_imageURL: '$imageURL',
    //     partner_payments: '$payments',
    //     partner_address: '$address',
    //
    //     campaign_id: '$microcredit._id',
    //     campaign_slug: '$microcredit.slug',
    //     campaign_imageURL: '$microcredit.imageURL',
    //     title: '$microcredit.title',
    //     terms: '$microcredit.terms',
    //     description: '$microcredit.description',
    //     category: '$microcredit.category',
    //     access: '$microcredit.access',
    //
    //     quantitative: '$microcredit.quantitative',
    //     stepAmount: '$microcredit.stepAmount',
    //     minAllowed: '$microcredit.minAllowed',
    //     maxAllowed: '$microcredit.maxAllowed',
    //     maxAmount: '$microcredit.maxAmount',
    //
    //     redeemStarts: '$microcredit.redeemStarts',
    //     redeemEnds: '$microcredit.redeemEnds',
    //     startsAt: '$microcredit.startsAt',
    //     expiresAt: '$microcredit.expiresAt',
    //
    //     support_id: '$microcredit.supports._id',
    //     backer_id: '$microcredit.supports.backer_id',
    //     initialTokens: '$microcredit.supports.initialTokens',
    //     redeemedTokens: '$microcredit.supports.redeemedTokens',
    //     method: '$microcredit.supports.method',
    //     payment_id: '$microcredit.supports.payment_id',
    //     status: '$microcredit.supports.status',
    //
    //     createdAt: '$microcredit.supports.createdAt',
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());
    // if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    // response.status(200).send({
    //   data: supports,
    //   code: 200
    // });
  }

  private readCampaigns = async (supports: Support[]) => {
    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        'microcredit._id': { $in: supports.map(a => new ObjectId(a.campaign_id)) }
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contacts: '$contacts',
        partner_phone: '$phone',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        stepAmount: '$microcredit.stepAmount',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        createdAt: '$microcredit.createdAt',
        updatedAt: '$microcredit.updatedAt'
      }
    }]).exec().catch());
    if (error) return [];

    // let error: Error, tokens: Tokens[];
    // [error, tokens] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $unwind: '$microcredit.supports'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'microcredit._id': { $in: campaigns.map(a => a.campaign_id) } },
    //       { 'microcredit.supports.status': status }
    //     ]
    //   }
    // }, {
    //   "$group": {
    //     '_id': '$microcredit._id',
    //     'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
    //     'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
    //   }
    // }]).exec().catch());
    // if (error) return [];

    return campaigns;
  }

  private readAllSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, supports: any[];
    [error, supports] = await to(this.transaction.aggregate(
      [
        {
          $match: {
            $and: [{
              partner_id: partner_id
            }, {
              'campaign_id': campaign_id
            }]
          }
        },
        { $sort: { date: 1 } },
        {
          $group:
          {
            _id: "$support_id",
            support_id: { '$first': "$support_id" },
            campaign_id: { '$first': "$campaign_id" },
            partner_id: { '$first': "$partner_id" },
            member_id: { '$first': "$member_id" },
            initialTokens: { '$first': "$tokens" },
            currentTokens: { '$sum': '$tokens' },
            method: { '$first': "$method" },
            payment_id: { '$first': "$payment_id" },

            type: { '$last': "$type" },
            transactions: { "$addToSet": { _id: "$_id", tokens: '$tokens', type: '$type', tx: '$tx', createdAt: '$createdAt' } },
            createdAt: { '$first': "$createdAt" },
          }
          // }, {
          //   $project: {
          //     status: {
          //       $cond:
          //       [
          //         {
          //           $or: [
          //             { $eq: ["$type", 'ReceiveFund'] },
          //             { $eq: ["$type", 'SpendFund'] }
          //           ]
          //         },
          //         "confirmation",
          //         "order"
          //       ]
          //     }
          //   }
        }
      ]
    ).exec().catch());
    // if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    // response.status(200).send({
    //   data: supports,
    //   code: 200
    // });

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: supports.map(o => { return { ...o, status: this.defineSupportStatus(o) } }),
      code: 200
    });

    // let error: Error, supports: any[];
    // [error, supports] = await to(this.transaction.aggregate(
    //   [
    //     {
    //       $match: {
    //         $and: [{
    //           'partner_id': partner_id
    //         }, {
    //           'campaign_id': campaign_id
    //         }]
    //       }
    //     },
    //     { $sort: { date: 1 } },
    //     {
    //       $group:
    //       {
    //         _id: "$support_id",
    //         partner_id: { '$first': '$partner_id' },
    //         campaign_id: { '$first': '$campaign_id' },
    //         currentTokens: { '$sum': '$tokens' },
    //         initialTokens: { '$first': "$tokens" },
    //         method: { '$first': "$method" },
    //         payment_id: { '$first': "$payment_id" },
    //         type: { '$last': "$type" },
    //         createdAt: { '$first': "$createdAt" },
    //       }
    //     }
    //   ]).exec().catch());
    // let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    // [error, supports] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $unwind: '$microcredit.supports'
    // }, {
    //   $match: {
    //     $and: [{
    //       _id: new ObjectId(partner_id)
    //     }, {
    //       'microcredit._id': new ObjectId(campaign_id)
    //     }]
    //   }
    // }, {
    //   $project: {
    //     _id: false,
    //     partner_id: '$_id',
    //     campaign_id: '$microcredit._id',
    //     support_id: '$microcredit.supports._id',
    //     backer_id: '$microcredit.supports.backer_id',
    //     initialTokens: '$microcredit.supports.initialTokens',
    //     redeemedTokens: '$microcredit.supports.redeemedTokens',
    //     method: '$microcredit.supports.method',
    //     payment_id: '$microcredit.supports.payment_id',
    //     ty: '$microcredit.supports.status',
    //     createdAt: '$microcredit.supports.createdAt',
    //   }
    // }, {
    //   $sort: {
    //     status: -1
    //   }
    // }
    // ]).exec().catch());

  }

  private readBackerSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const member: User = response.locals.member;
    console.log(member);

    let error: Error, supports: any[];
    [error, supports] = await to(this.transaction.aggregate(
      [
        {
          $match: {
            $and: [{
              'partner_id': partner_id
            }, {
              'campaign_id': campaign_id
            }, {
              'member_id': (member._id).toString()
            }]
          }
        },
        { $sort: { date: 1 } },
        {
          $group:
          {
            _id: "$support_id",
            support_id: { '$first': '$support_id' },
            partner_id: { '$first': '$partner_id' },
            campaign_id: { '$first': '$campaign_id' },
            currentTokens: { '$sum': '$tokens' },
            initialTokens: { '$first': "$tokens" },
            method: { '$first': "$method" },
            payment_id: { '$first': "$payment_id" },
            type: { '$last': "$type" },
            createdAt: { '$first': "$createdAt" },
          }
        }
      ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const transactions: { _id: string, transactions: MicrocreditTransaction[] }[] = await this.readTransactions(partner_id, (member._id).toString(), campaign_id);
    const supportWithTransactions = supports.map((a: Support) =>
      Object.assign({}, a,
        {
          status: this.defineSupportStatus(a),
          transactions: (transactions.find((e: { _id: string, transactions: MicrocreditTransaction[] }) => e._id === a.support_id)).transactions
        }
      )
    );
    console.log(transactions);

    response.status(200).send({
      data: supportWithTransactions,
      code: 200
    });

    // let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    // [error, supports] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $unwind: '$microcredit.supports'
    // }, {
    //   $match: {
    //     $and: [{
    //       _id: new ObjectId(partner_id)
    //     }, {
    //       'microcredit._id': new ObjectId(campaign_id)
    //     }, {
    //       'microcredit.supports.backer_id': (member._id).toString()
    //     }]
    //   }
    // }, {
    //   $project: {
    //     _id: false,
    //     partner_id: '$_id',
    //     campaign_id: '$microcredit._id',
    //     support_id: '$microcredit.supports._id',
    //     backer_id: '$microcredit.supports.backer_id',
    //     initialTokens: '$microcredit.supports.initialTokens',
    //     redeemedTokens: '$microcredit.supports.redeemedTokens',
    //     method: '$microcredit.supports.method',
    //     payment_id: '$microcredit.supports.payment_id',
    //     status: '$microcredit.supports.status',
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());
    // if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    //
    // const transactions: { _id: string, transactions: MicrocreditTransaction[] }[] = await this.readTransactions(partner_id, (member._id).toString(), campaign_id);
    // const supportsTransactions = supports.map((a: Support) =>
    //   Object.assign({}, a,
    //     {
    //       transactions: ((transactions).find((e: { _id: string, transactions: MicrocreditTransaction[] }) => (e._id).toString() === (a.support_id).toString())).transactions,
    //     }
    //   )
    // );
    //
    // response.status(200).send({
    //   data: supportsTransactions,
    //   code: 200
    // });
  }



  private readTransactions = async (partner_id: string, member_id: string, campaign_id: string) => {

    let error: Error, transactions: { _id: string, transactions: MicrocreditTransaction[] }[];
    [error, transactions] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'member_id': member_id }, { 'partner_id': partner_id }, { 'campaign_id': campaign_id },
          { $or: [{ type: "PromiseFund" }, { type: "SpendFund" }, { type: "ReceiveFund" }, { type: "RevertFund" }] }
        ]
      }
    }, {
      $group: {
        _id: '$support_id',
        transactions: {
          "$addToSet": {
            id: "$_id", tokens: '$tokens', member_id: '$member_id', partner_id: 'partner_id', type: '$type', tx: '$tx', createdAt: '$createdAt'
          }
        }
      }
    }, {
      $project: {
        "transactions": 1
      }
    }]).exec().catch());
    if (error) return [];
    console.log("Transactions");
    console.log(transactions[0].transactions);
    console.log(transactions[1].transactions);
    return transactions;
  }
}

export default MicrocreditSupportsController;
