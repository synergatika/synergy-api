import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

// Dtos
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import PaymentDto from '../microcreditDtos/payment.params.dto';
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
import customerMiddleware from '../middleware/customer.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
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
    this.router.get(`${this.path}/`, authMiddleware, this.readAllBackerSupports);
    this.router.get(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), this.readAllSupportsByCampaign);
    this.router.get(`${this.path}/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readBackerSupportsByCampaign);
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, supports: any[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        'microcredit.supports.backer_id': (user._id).toString()
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
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

        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readAllSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
        createdAt: '$microcredit.supports.createdAt',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readBackerSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const customer: User = response.locals.customer;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, supports] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }, {
          'microcredit.supports.backer_id': (customer._id).toString()
        }]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
        method: '$microcredit.supports.method',
        status: '$microcredit.supports.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: supports,
      code: 200
    });
  }
}

export default MicrocreditSupportsController;
