import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Email Service
 */
import EmailService from '../utils/emailService';
const emailService = new EmailService();

/**
 * DTOs
 */
import InvitationDto from '../communityDtos/invitation.dto'
import CommunicationDto from '../communityDtos/communication.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import PartnerID from '../usersDtos/partner_id.params.dto'
import PostEvent from '../communityInterfaces/post_event.interface';

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
const offsetParams = OffsetHelper.offseIndex;

/**
 * Models
 */
import userModel from '../models/user.model';
// import invitationModel from '../models/invitation.model';

class CommunityController implements Controller {
  public path = '/community';
  public router = express.Router();
  private user = userModel;
  // private invitation = invitationModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPublicPostsEvents);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPrivatePostsEvents);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPublicPostsEventsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPrivatePostsEventsByStore);

    this.router.post(`${this.path}/invite`, authMiddleware, validationBodyMiddleware(InvitationDto), this.sendInvitation, emailService.userInvitation);

    this.router.post(`${this.path}/communicate`, validationBodyMiddleware(CommunicationDto), this.sendCommunication, emailService.internalCommunication);
  }

  private sendCommunication = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CommunicationDto = request.body;

    response.locals = {
      res: {
        code: 200,
        body: {
          message: "Communication sent",
          code: 200
        }
      },
      sender: data.sender,
      content: data.content,
    }

    next();
  }

  private sendInvitation = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: InvitationDto = request.body;

    response.locals = {
      res: {
        code: 200,
        body: {
          message: "Invitation sent",
          code: 200
        }
      },
      receiver: data.receiver,
      user: request.user
    }

    next();
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

  private readPublicPostsEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          { 'activated': true },
          { 'posts.access': 'public' }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_slug: '$posts.slug',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',
        access: '$posts.access',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $and: [
          { 'activated': true },
          { 'events.access': 'public' },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.content',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count), //    singers.sort(compare);
      code: 200
    });
    //products.slice(index,index+count)
  }

  private readPrivatePostsEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          { 'activated': true },
          { 'posts.access': { $in: ['public', 'private', access] } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_slug: '$posts.slug',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',
        access: '$posts.access',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $and: [
          { 'activated': true },
          { 'events.access': { $in: ['public', 'private', access] } },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.content',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  private readPublicPostsEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'posts.access': 'public' }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'posts.access': 'public' }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_slug: '$posts.slug',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',
        access: '$posts.access',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.content',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  private readPrivatePostsEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'posts.access': { $in: ['public', 'private', access] } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'posts.access': { $in: ['public', 'private', access] } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_slug: '$posts.slug',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',
        access: '$posts.access',

        createdAt: '$posts.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.content',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$events.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }
}

export default CommunityController;
