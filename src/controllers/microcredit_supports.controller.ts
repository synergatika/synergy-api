import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

// Dtos
import PartnerID from '../usersDtos/partner_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import usersMiddleware from '../middleware/users.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
import OffsetHelper from '../middleware/offset.helper';
// Helper's Instance
const offsetParams = OffsetHelper.offsetLimit;
// Models
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';

// Path
var path = require('path');

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
    this.router.get(`${this.path}/:partner_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, this.readAllSupportsByCampaign);
    this.router.get(`${this.path}/:partner_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, validationParamsMiddleware(IdentifierDto), usersMiddleware.member, this.readBackerSupportsByCampaign);
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, supports: any[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [
          { 'microcredit.supports.backer_id': (user._id).toString() },
          { 'microcredit.redeemEnds': { $gt: offset.greater } },
          { $expr: { $gt: ["$microcredit.supports.initialTokens", (offset.greater > 0) ? "$microcredit.supports.redeemedTokens" : 0] } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',
        partner_payments: '$payments',
        partner_address: '$address',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
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

        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        payment_id: '$microcredit.supports.payment_id',
        status: '$microcredit.supports.status',

        createdAt: '$microcredit.supports.createdAt',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readAllSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(partner_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        payment_id: '$microcredit.supports.payment_id',
        status: '$microcredit.supports.status',
        createdAt: '$microcredit.supports.createdAt',
      }
    }, {
      $sort: {
        status: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readBackerSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const member: User = response.locals.member;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(partner_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }, {
          'microcredit.supports.backer_id': (member._id).toString()
        }]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        payment_id: '$microcredit.supports.payment_id',
        status: '$microcredit.supports.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }
}

export default MicrocreditSupportsController;
