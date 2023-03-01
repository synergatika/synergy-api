

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
import { User, MicrocreditSupport } from '../_interfaces/index';

/**
 * Middleware
 */
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import usersMiddleware from '../middleware/items/users.middleware';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import supportModel from '../models/support.model';

class MicrocreditSupportsController implements Controller {
  public path = '/microcredit/supports';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:offset`,
      authMiddleware,
      this.readAllBackerSupports);

    this.router.get(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      this.readAllSupportsByCampaign);

    this.router.get(`${this.path}/:partner_id/:campaign_id/:_to`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo,
      validationParamsMiddleware(IdentifierToDto), usersMiddleware.member,
      this.readBackerSupportsByCampaign);
  }

  private readAllBackerSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const params: string = request.params.offset;
    console.log("1")

    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, supports: any[];
    [error, supports] = await to(supportModel.find({
      "member": user._id
    }).populate({
      "path": 'campaign',
      "populate": {
        "path": 'partner'
      }
    })
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: supports,
      code: 200
    });
  }

  private readAllSupportsByCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    console.log("2")

    let error: Error, supports: any[];
    [error, supports] = await to(supportModel.find({
      "campaign": new ObjectId(campaign_id)
    })
      .lean()
      .catch());
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

    console.log("3")
    console.log(campaign_id, member._id)
    let error: Error, supports: MicrocreditSupport[];
    [error, supports] = await to(supportModel.find({
      "$and": [
        // { "partner": new ObjectId(partner_id) },
        { "campaign": new ObjectId(campaign_id) },
        { "member": member._id }
      ]
    })
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    console.log(supports)
    response.status(200).send({
      data: supports,
      code: 200
    });

  }
}

export default MicrocreditSupportsController;
