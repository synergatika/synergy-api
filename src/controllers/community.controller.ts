import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Emails Util
 */
import EmailsUtil from '../utils/email.util';
const emailsUtil = new EmailsUtil();

/**
 * DTOs
 */
import { CommunicationDto, InvitationDto, PartnerID } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { PostEvent, Partner, ItemAccess, UserAccess } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instances
 */
const offsetParams = OffsetHelper.offsetIndex;

/**
 * Models
 */
import userModel from '../models/user.model';
import postModel from '../models/post.model';
import eventModel from '../models/event.model';

class CommunityController implements Controller {
  public path = '/community';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * Posts & Events
     */
    this.router.get(`${this.path}/public/:offset`,
      this.readPostsEvents);

    this.router.get(`${this.path}/private/:offset`,
      authMiddleware,
      this.readPostsEvents);

    this.router.get(`${this.path}/public/:partner_id/:offset`,
      validationParamsMiddleware(PartnerID),
      this.readPostsEventsByStore);

    this.router.get(`${this.path}/private/:partner_id/:offset`,
      authMiddleware,
      validationParamsMiddleware(PartnerID),
      this.readPostsEventsByStore);

    /**
     * Invite & Communicate
     */
    this.router.post(`${this.path}/invite`,
      authMiddleware,
      validationBodyMiddleware(InvitationDto),
      this.sendInvitation);

    this.router.post(`${this.path}/communicate`,
      validationBodyMiddleware(CommunicationDto),
      this.sendCommunication);
  }

  /**
   *
   * Secondary Functions
   *  
   */

  private sortPostsEvents = (a: PostEvent, b: PostEvent) => {
    const timestampA = a.createdAt;
    const timestampB = b.createdAt;

    let comparison = 0;
    if (timestampA > timestampB) {
      comparison = 1;
    } else if (timestampA < timestampB) {
      comparison = -1;
    }
    return comparison;
  }

  /**
   *
   * Main Functions (Route: `/community`)
   *  
   */

  private sendCommunication = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CommunicationDto = request.body;

    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.internalCommunication(request.headers['content-language'], data.sender, data.content).catch());
    if (email_error) throw (`EMAIL ERROR - InternalCommunication: ${email_error}`);

    response.status(200).send({
      message: "Communication sent",
      code: 200
    });
  }

  private sendInvitation = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: InvitationDto = request.body;

    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.userInvitation(request.headers['content-language'], data.receiver, request.user).catch());
    if (email_error) throw (`EMAIL ERROR - UserInvitation: ${email_error}`);

    response.status(200).send({
      message: "Invitation sent",
      code: 200
    });
  }

  private readPostsEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const accessParam: string = (request.params.offset).split("-")[3]
    const offset: {
      index: number, count: number, greater: number, type: boolean
    } = offsetParams(params);

    let access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == UserAccess.PARTNER) access_filter.push(ItemAccess.PARTNERS);
    if (accessParam && accessParam == '1') access_filter = [ItemAccess.PARTNERS];
    if (accessParam && accessParam == '0') access_filter = [ItemAccess.PUBLIC, ItemAccess.PRIVATE];
    /** ***** * ***** */

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(postModel.aggregate([
      {
        "$match": {
          "$and": [
            { "access": { "$in": access_filter } },
            { "published": { "$eq": true } }
          ]
        }
      },
      {
        "$lookup": {
          "from": 'Partner',
          "localField": 'partner',
          "foreignField": '_id',
          "as": 'partner'
        }
      },
      {
        "$match": { 'partner.activated': true }
      }])
      .sort({ "updatedAt": -1 })
      .exec()
      .catch());

    // let error: Error, posts: PostEvent[], events: PostEvent[];
    // [error, posts] = await to(postModel.find({
    //   "$and": [
    //     { "access": { "$in": access_filter } },
    //     { "published": { "$eq": true } }
    //   ]
    // }).populate([{
    //   "path": 'partner'
    // }])
    //   .sort({ "updatedAt": -1 })
    //   .lean()
    //   .catch());

    [error, events] = await to(eventModel.aggregate([
      {
        "$match": {
          "$and": [
            { "access": { "$in": access_filter } },
            { "dateTime": { "$gt": offset.greater } },
            { "published": { "$eq": true } }
          ]
        },
      },
      {
        "$lookup": {
          "from": 'Partner',
          "localField": 'partner',
          "foreignField": '_id',
          "as": 'partner'
        }
      },
      {
        "$match": { 'partner.activated': true }
      }])
      .sort({ "updatedAt": -1 })
      .exec()
      .catch());

    // [error, events] = await to(eventModel.find({
    //   "$and": [
    //     { "access": { "$in": access_filter } },
    //     { "dateTime": { "$gt": offset.greater } },
    //     { "activated": { "$eq": true } }
    //   ]
    // }).populate([{
    //   "path": 'partner'
    // }])
    //   .sort({ "updatedAt": -1 })
    //   .lean()
    //   .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: (([
        ...(posts.map((o => { return { ...o, type: 'post' } }))),
        ...(events.map((o => { return { ...o, type: 'event' } })))
      ]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  private readPostsEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == UserAccess.PARTNER) access_filter.push(ItemAccess.PARTNERS);

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };

    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(userModel.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(postModel.find({
      "$and": [
        { "partner": _user },
        { "access": { "$in": access_filter } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .lean()
      .catch());

    [error, events] = await to(eventModel.find({
      "$and": [
        { "partner": _user },
        { "access": { "$in": access_filter } },
        { "dateTime": { "$gt": offset.greater } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: (([
        ...(posts.map((o => { return { ...o, type: 'post' } }))),
        ...(events.map((o => { return { ...o, type: 'event' } })))
      ]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }
}

export default CommunityController;
