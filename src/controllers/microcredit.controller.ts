import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
import EarnTokensDto from '../microcreditDtos/earnTokens.dto';
import RedeemTokensDto from '../microcreditDtos/redeemTokens.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware'
import customerMiddleware from '../middleware/customer.middleware'
// Models
import userModel from '../models/user.model';

class MicrocreditController implements Controller {
  public path = '/microcredit';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id`, authMiddleware, validationParamsMiddleware(CampaignID), validationBodyMiddleware(EarnTokensDto), this.earnTokens);
    this.router.post(`${this.path}/earn/:merchant_id/:campaign_id/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationParamsMiddleware(IdentifierDto), validationBodyMiddleware(EarnTokensDto), customerMiddleware, this.earnTokensByMerchant);
    this.router.post(`${this.path}/redeem/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationBodyMiddleware(RedeemTokensDto), customerMiddleware, this.redeemTokens);
  }

  private earnTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;
    const user: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.supports': {
            "backer_id": user._id,
            "initialTokens": data._amount,
            "redeemedTokens": 0
          }
        }
      }, { new: true }).catch());

    const currentCampaign = results.microcredit[results.microcredit.map(function(e: any) { return e._id; }).indexOf(campaign_id)];
    const currentSupport = currentCampaign.supports[currentCampaign["supports"].length - 1];

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      data: {
        support_id: currentSupport._id,
        backer_id: currentSupport.backer_id,
        amount: currentSupport.initialTokens,
        payment: currentSupport._id,
      },
      code: 201
    });
  }

  private earnTokensByMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: EarnTokensDto = request.body;
    const customer: User = response.locals.customer;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id,
      'microcredit._id': campaign_id
    }, {
        $push: {
          'microcredit.$.supports': {
            'backer_id': customer._id,
            'initialTokens': data._amount,
            "redeemedTokens": 0,
            "status": data.paid ? 'confirmation' : 'order'
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! Backer added €" + data._amount + " for token, for Campaign " + campaign_id + "!",
      code: 201
    });
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: RedeemTokensDto = request.body;
    const customer: User = response.locals.customer;

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: new ObjectId(merchant_id),
      'microcredit._id': new ObjectId(campaign_id),
      'microcredit.supports._id': data.support_id,
      // 'microcredit.supports.status': 'confirmation',
      // 'microcredit.supports.backer_id': (customer._id).toString()
    }, {
        $inc: {
          'microcredit.$.supports.$[d].redeemedTokens': Math.round(data._tokens)
        }
      }, { "arrayFilters": [{ "d._id": data.support_id }] }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      message: "Success! Backer use " + Math.round(data._tokens) + " token, for Campaign " + campaign_id + "!",
      code: 200
    });
  }
}

export default MicrocreditController;
