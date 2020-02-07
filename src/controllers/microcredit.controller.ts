import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import CampaignDto from '../microcreditDtos/campaign.dto';
import RedeemTokensDto from '../microcreditDtos/redeemTokens.dto';
import MerchantID from '../usersDtos/merchant_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
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
    this.router.post(`${this.path}/redeem/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.belongsTo, validationParamsMiddleware(CampaignID), validationBodyMiddleware(RedeemTokensDto), customerMiddleware, this.redeemTokens);
  }

  private redeemTokens = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const customer: User = response.locals.customer;
    const data: RedeemTokensDto = request.body;
    data._points = Math.round(data._points);

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateMany({
      _id: merchant_id,
      'microcredit._id': campaign_id,
      'microcredit.backers.backer_id': (customer._id).toString()
    }, {
        $inc: {
          'microcredit.$.backers.$[d].redeemedTokens': data._points
        }
      }, { "arrayFilters": [{ "d.backer_id": (customer._id).toString() }] }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      message: "Success! Backer use " + data._points + " token, for Campaign " + campaign_id + " !",
      code: 200
    });
  }
}

export default MicrocreditController;
