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
import { User, PostEvent, Partner, ItemAccess, UserAccess } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instances
 */
const offsetParams = OffsetHelper.offsetIndex;

/**
 * Models
 */
import userModel from '../models/user.model';
// import invitationModel from '../models/invitation.model';
import postModel from '../models/post.model';
import eventModel from '../models/event.model';

class CommunityController implements Controller {
  public path = '/community';
  public router = express.Router();
  private user = userModel;
  // private invitation = invitationModel;
  private postModel = postModel;
  private eventModel = eventModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPostsEvents);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPostsEvents);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPostsEventsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPostsEventsByStore);

    this.router.post(`${this.path}/invite`, authMiddleware, validationBodyMiddleware(InvitationDto), this.sendInvitation,
      //  emailsUtil.userInvitation
    );

    this.router.post(`${this.path}/communicate`, validationBodyMiddleware(CommunicationDto), this.sendCommunication,
      // emailsUtil.internalCommunication
    );
  }

  private sendCommunication = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CommunicationDto = request.body;

    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.internalCommunication(request.headers['content-language'], data.sender, data.content).catch());
    if (email_error) throw (`EMAIL ERROR - InternalCommunication: ${email_error}`);

    response.status(200).send({
      message: "Communication sent",
      code: 200
    });
    // response.locals = {
    //   res: {
    //     code: 200,
    //     body: {
    //       message: "Communication sent",
    //       code: 200
    //     }
    //   },
    //   sender: data.sender,
    //   content: data.content,
    // }

    // next();
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

    //   response.locals = {
    //     code: 200,
    //     body: {
    //       message: "Invitation sent",
    //       code: 200
    //     }
    //   },
    //     receiver: data.receiver,
    //       user: request.user
    // }

    // next();
  }

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
    [error, posts] = await to(this.postModel.find(
      {
        $and: [
          // { 'activated': true },
          { 'access': { $in: access_filter } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .lean()
      .catch());
    // [error, posts] = await to(this.user.aggregate([{
    //   $unwind: '$posts'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'activated': true },
    //       { 'posts.access': { $in: access_filter } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectPost()
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());

    [error, events] = await to(this.eventModel.find(
      {
        $and: [
          // { 'activated': true },
          { 'access': { $in: access_filter } },
          { 'dateTime': { $gt: offset.greater } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .lean()
      .catch());
    // [error, events] = await to(this.user.aggregate([{
    //   $unwind: '$events'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'activated': true },
    //       { 'events.access': { $in: access_filter } },
    //       { 'events.dateTime': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectEvent()
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());
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
    [_error, _user] = await to(this.user.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.postModel.find(
      {
        $and: [
          { 'partner': _user },
          { 'access': { $in: access_filter } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .lean()
      .catch());
    // [error, posts] = await to(this.user.aggregate([{
    //   $unwind: '$posts'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       { 'posts.access': { $in: access_filter } }
    //     ]
    //   },
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectPost()
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());

    [error, events] = await to(this.eventModel.find(
      {
        $and: [
          { 'partner': _user },
          { 'access': { $in: access_filter } },
          { 'dateTime': { $gt: offset.greater } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .lean()
      .catch());
    // [error, events] = await to(this.user.aggregate([{
    //   $unwind: '$events'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       { 'events.access': { $in: access_filter } },
    //       { 'events.dateTime': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectEvent()
    //   }
    // }, {
    //   $sort: {
    //     createdAt: -1
    //   }
    // }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: (([
        ...(posts.map((o => { return { ...o, type: 'post' } }))),
        ...(events.map((o => { return { ...o, type: 'event' } })))
      ]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  // /**
  // *  
  // * Local Function Section 
  // *
  // * */

  // /** Project Partner (Local Function) */
  // private projectPartner() {
  //   return {
  //     _id: '$_id',
  //     name: '$name',
  //     email: '$email',
  //     slug: '$slug',
  //     imageURL: '$imageURL',
  //     payments: '$payments',
  //     address: '$address',
  //     contacts: '$contacts',
  //     phone: '$phone',
  //   };
  // }

  // /** Project Post (Local Function) */
  // private projectPost() {
  //   return {
  //     _id: '$posts._id',
  //     slug: '$posts.slug',
  //     imageURL: '$posts.imageURL',
  //     type: 'post',
  //     title: '$posts.title',
  //     subtitle: '$posts.subtitle',
  //     description: '$posts.description',
  //     access: '$posts.access',

  //     createdAt: '$posts.createdAt',
  //     updatedAt: '$posts.updatedAt'
  //   };
  // }

  // /** Project Event (Local Function) */
  // private projectEvent() {
  //   return {
  //     _id: '$events._id',
  //     slug: '$events.slug',
  //     imageURL: '$events.imageURL',
  //     type: 'event',
  //     title: '$events.title',
  //     subtitle: '$events.subtitle',
  //     description: '$events.description',
  //     access: '$events.access',
  //     location: '$events.location',
  //     dateTime: '$events.dateTime',

  //     createdAt: '$events.createdAt',
  //     updatedAt: '$events.updatedAt'
  //   };
  // }
}

export default CommunityController;
