import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

// Dtos
import BackerDto from '../microcreditDtos/backer.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'
import CampaignID from '../microcreditDtos/campaign_id.params.dto'
import IdentifierDto from '../loyaltyDtos/identifier.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import MicrocreditCampaign from '../microcreditInterfaces/campaign.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import customerMiddleware from '../middleware/customer.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';

class MicrocreditBackersController implements Controller {
  public path = '/microcredit/backers';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, validationParamsMiddleware(CampaignID), validationBodyMiddleware(BackerDto), this.createBacker);
    this.router.post(`${this.path}/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(BackerDto), customerMiddleware, this.createCustomerBacker);
    this.router.put(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), this.confirmBacker);
    this.router.get(`${this.path}/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), customerMiddleware, this.readCustomerBacker);


/*
    this.router.get(`${this.path}/public/:merchant_id`, validationParamsMiddleware(MerchantID), this.readPublicCampaignsByStore);
    this.router.get(`${this.path}/private/:merchant_id`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivateCampaignsByStore);
    this.router.get(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, this.readCampaign);
    this.router.put(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(CampaignDto), this.updateCampaign);
    this.router.delete(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, this.deleteCampaign);
  */}
  private readCustomerBacker = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const customer: User = response.locals.customer;

    let error: Error, backer: any; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, backer] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.backers'
    }, {
      $match: {
        $and: [{
          _id: new ObjectId(merchant_id)
        }, {
          'microcredit._id': new ObjectId(campaign_id)
        }, {
          'microcredit.backers.backer_id': (customer._id).toString()
        }]
      }
    }, {
      $project: {
        _id: false,
        campaign_id: '$microcredit._id',
        support_id: '$microcredit.backers._id',
        backer_id: '$microcredit.backers.backer_id',
        initialTokens: '$microcredit.backers.initialTokens',
        redeemedTokens: '$microcredit.backers.redeemedTokens',
        status: '$microcredit.backers.status',
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: backer,
      code: 200
    });
  }

  private createBacker = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: BackerDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.backers': {
            "backer_id": user._id,
            "initialTokens": data.amount,
            "redeemedTokens": 0
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! Backer added €" + data.amount + " for token, for Campaign " + campaign_id + " !",
      code: 201
    });
  }

  private createCustomerBacker = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: BackerDto = request.body;
    const customer: User = response.locals.customer;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.backers': {
            'backer_id': customer._id,
            'initialTokens': data.amount,
            "redeemedTokens": 0
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! Backer added €" + data.amount + " for token, for Campaign " + campaign_id + " !",
      code: 201
    });
  }

  private confirmBacker = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const payment_id: string[] = request.body.payment_id;

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: merchant_id,
      'microcredit._id': campaign_id,
      'microcredit.backers.payment_id': { $in: payment_id }
    }, {
        $set: {
          'microcredit.$.backers.$[d].status': 'confirmation'
        }
      }, { "arrayFilters": [{ "d.payment_id": { $in: payment_id } }] }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Campaign " + campaign_id + " has been updated for " + payment_id + " !",
      code: 200
    });
  }
}
export default MicrocreditBackersController;
