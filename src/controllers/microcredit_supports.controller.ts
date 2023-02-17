

import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
var path = require('path');

/**
 * DTOs
 */
import { IdentifierToDto, CampaignID } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, MicrocreditSupport, MicrocreditTransaction, MicrocreditSupportStatus } from '../_interfaces/index';

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
import microcreditModel from '../models/campaign.model';
import supportModel from '../models/support.model';

class MicrocreditSupportsController implements Controller {
  public path = '/microcredit/supports';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;
  private microcreditModel = microcreditModel;
  private supportModel = supportModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:offset`,
      authMiddleware,
      this.readAllBackerSupports2);

    this.router.get(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      this.readAllSupportsByCampaign2);

    this.router.get(`${this.path}/:partner_id/:campaign_id/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      validationParamsMiddleware(IdentifierToDto), usersMiddleware.member,
      this.readBackerSupportsByCampaign2);
  }

  /**
   * Primary Functions
   */

  private readAllBackerSupports2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, supports: any[];
    [error, supports] = await to(this.supportModel.find(
      { member: user._id }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    console.log(supports);

    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number, type: boolean
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

    const campaigns: MicrocreditCampaign[] = await this.readCampaigns(supports);
    const supportsWithCampaign = supports.map((a: any) =>
      Object.assign({}, a,
        {
          status: this.defineSupportStatus(a),
          // campaign: (campaigns).find((b: MicrocreditCampaign) => (b._id).toString() === ((a.campaign as MicrocreditCampaign)._id).toString()),
          campaign: (campaigns).find((b: MicrocreditCampaign) => (b._id).toString() === (a.campaign_id).toString()),
        }
      )
    );

    response.status(200).send({
      data: supportsWithCampaign,
      code: 200
    });
  }

  private readAllSupportsByCampaign2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, supports: any[];
    [error, supports] = await to(this.supportModel.find(
      // {
      // "$and": [
      // { partner: new ObjectId(partner_id) },
      { campaign: new ObjectId(campaign_id) }
      // ]
      // }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    console.log(supports);

    response.status(200).send({
      data: supports,
      code: 200
    });
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
        }
      ]
    ).exec().catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: supports.map(o => { return { ...o, status: this.defineSupportStatus(o) } }),
      code: 200
    });
  }

  private readBackerSupportsByCampaign2 = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const member: User = response.locals.member;

    let error: Error, supports: any[];
    [error, supports] = await to(this.supportModel.find(
      {
        "$and": [
          { partner: new ObjectId(partner_id) },
          { campaign: new ObjectId(campaign_id) },
          { member: member._id }
        ]
      }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    console.log(supports);

    response.status(200).send({
      data: supports,
      code: 200
    });

  }

  private readBackerSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const member: User = response.locals.member;

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
    const supportWithTransactions = supports.map((a: MicrocreditSupport) =>
      Object.assign({}, a,
        {
          status: this.defineSupportStatus(a),
          transactions: (transactions.find((e: { _id: string, transactions: MicrocreditTransaction[] }) => e._id === a._id.toString())).transactions
        }
      )
    );

    response.status(200).send({
      data: supportWithTransactions,
      code: 200
    });
  }


  /**
   * Secondary Functions
   */

  private defineSupportStatus(a: any) {
    if (a.currentTokens == 0) return MicrocreditSupportStatus.COMPLETED;
    else if (a.type == 'PromiseFund' || a.type == 'RevertFund') return MicrocreditSupportStatus.UNPAID;
    else if (a.type == 'ReceiveFund' || a.type == 'SpendFund') return MicrocreditSupportStatus.PAID;
  }

  private readCampaigns = async (supports: any[]) => {
    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.microcreditModel.find(
      // { _id: { $in: supports.map(a => new ObjectId((a.campaign as MicrocreditCampaign)._id)) } }
      { _id: { $in: supports.map(a => new ObjectId(a.campaign_id)) } }
    )
      .populate([{
        path: 'partner'
      }])
      .catch());
    // [error, campaigns] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $match: {
    //     'microcredit._id': { $in: supports.map(a => new ObjectId(a.campaign_id)) }
    //   }
    // }, {
    //   $project: {
    //     partner: {
    //       _id: '$_id',
    //       slug: '$slug',
    //       name: '$name',
    //       email: '$email',
    //       imageURL: '$imageURL',

    //       payments: '$payments',
    //       address: '$address',
    //       contacts: '$contacts',
    //       phone: '$phone',
    //     },
    //     _id: '$microcredit._id',
    //     slug: '$microcredit.slug',
    //     imageURL: '$microcredit.imageURL',
    //     title: '$microcredit.title',
    //     subtitle: '$microcredit.subtitle',
    //     terms: '$microcredit.terms',
    //     description: '$microcredit.description',
    //     category: '$microcredit.category',
    //     access: '$microcredit.access',

    //     quantitative: '$microcredit.quantitative',
    //     redeemable: '$microcredit.redeemable',
    //     stepAmount: '$microcredit.stepAmount',
    //     minAllowed: '$microcredit.minAllowed',
    //     maxAllowed: '$microcredit.maxAllowed',
    //     maxAmount: '$microcredit.maxAmount',

    //     redeemStarts: '$microcredit.redeemStarts',
    //     redeemEnds: '$microcredit.redeemEnds',
    //     startsAt: '$microcredit.startsAt',
    //     expiresAt: '$microcredit.expiresAt',

    //     createdAt: '$microcredit.createdAt',
    //     updatedAt: '$microcredit.updatedAt'
    //   }
    // }]).exec().catch());
    if (error) return [];

    return campaigns;
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

    return transactions;
  }
}

export default MicrocreditSupportsController;
