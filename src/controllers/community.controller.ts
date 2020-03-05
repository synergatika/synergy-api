import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var path = require('path');
// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import InvitationDto from '../communityDtos/invitation.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import MerchantID from '../usersDtos/merchant_id.params.dto'
import PostEvent from '../communityInterfaces/post_event.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
import invitationModel from '../models/invitation.model';

class CommunityController implements Controller {
  public path = '/community';
  public router = express.Router();
  private user = userModel;
  private invitation = invitationModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPublicPostsEvents);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPrivatePostsEvents);
    this.router.get(`${this.path}/public/:merchant_id/:offset`, validationParamsMiddleware(MerchantID), this.readPublicPostsEventsByStore);
    this.router.get(`${this.path}/private/:merchant_id/:offset`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivatePostsEventsByStore);
  }

  // offset: [number, number, number] = [items per page, current page, active or all]
  private offsetParams = (params: string) => {
    if (!params) return { index: 0, count: Number.MAX_SAFE_INTEGER, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      index: parseInt(splittedParams[0]) * parseInt(splittedParams[1]),
      count: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : parseInt(splittedParams[0]),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
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
    } = this.offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        'posts.access': 'public'
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
          { 'events.access': 'public' },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.description',
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

    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count), //    singers.sort(compare);
      code: 200
    });
    //products.slice(index,index+count)
  }

  private readPrivatePostsEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = this.offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        'posts.access': { $in: ['public', 'private', access] }
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
          { 'events.access': { $in: ['public', 'private', access] } },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.description',
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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  private readPublicPostsEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = this.offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'posts.access': 'public' }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'posts.access': 'public' }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.description',
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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }

  private readPrivatePostsEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      index: number, count: number, greater: number
    } = this.offsetParams(params);

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'posts.access': { $in: ['public', 'private', access] } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'posts.access': { $in: ['public', 'private', access] } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_slug: '$events.slug',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
        subtitle: '$events.subtitle',
        content: '$events.description',
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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: (([...posts, ...events]).sort(this.sortPostsEvents)).slice(offset.index, offset.index + offset.count),
      code: 200
    });
  }
}

export default CommunityController;