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
import Support from '../microcreditInterfaces/support.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import customerMiddleware from '../middleware/customer.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';

class MicrocreditSupportsController implements Controller {
  public path = '/microcredit/supports';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/`, authMiddleware, this.readAllSupports);
    this.router.get(`${this.path}/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readSupportsByCampaign);
    this.router.put(`${this.path}/:merchant_id/:campaign_id/:payment`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(PaymentDto), this.confirmSupportPayment);
  }

  private readAllSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
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
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
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

  private readSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
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
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.supports._id',
        backer_id: '$microcredit.supports.backer_id',
        initialTokens: '$microcredit.supports.initialTokens',
        redeemedTokens: '$microcredit.supports.redeemedTokens',
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

  private confirmSupportPayment = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const status: string = (request.params.payment === 'pay') ? 'confirmation' : 'order';
    const payment_id: string[] = request.body.payment_id;

    let error: Error, results: any; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: merchant_id,
      'microcredit._id': campaign_id,
      'microcredit.supports._id': { $in: payment_id }
    }, {
        $set: {
          'microcredit.$.supports.$[d].status': status
        }
      }, { "arrayFilters": [{ "d._id": { $in: payment_id } }] }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: (results['nModified']) ? "Success! Campaign with Id:" + campaign_id + " has been updated to Status:" + status + " for Payments:" + payment_id + "!" : "Nothing to Update",
      code: 200
    });
  }
}

export default MicrocreditSupportsController;
