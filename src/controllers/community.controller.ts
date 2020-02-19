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
    this.router.get(`${this.path}/public`, this.readPublicPostsEvents);
    this.router.get(`${this.path}/private`, authMiddleware, this.readPrivatePostsEvents);
    this.router.get(`${this.path}/public/:merchant_id`, validationParamsMiddleware(MerchantID), this.readPublicPostsEventsByStore);
    this.router.get(`${this.path}/private/:merchant_id`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivatePostsEventsByStore);

    this.router.post(`${this.path}/invite`, authMiddleware, validationBodyMiddleware(InvitationDto), this.inviteAFriend, this.emailSender);
    //   this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, /*accessMiddleware.confirmPassword,*/ validationBodyMiddleware(RedeemPointsDto), this.redeemToken);
    /*  this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance);
      this.router.get(`${this.path}/points/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, this.readCustomerBalance);
      this.router.get(`${this.path}/transactions`, authMiddleware, this.readTransactions);
      this.router.get(`${this.path}/partners_info`, authMiddleware, this.partnersInfoLength);
      this.router.get(`${this.path}/transactions_info`, authMiddleware, this.transactionInfoLength);*/
  }


  private readPublicPostsEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

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
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
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
        'events.access': 'public'
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: [...posts, ...events],
      code: 200
    });
  }

  private readPrivatePostsEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

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
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
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
        'events.access': { $in: ['public', 'private', access] }
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: [...posts, ...events],
      code: 200
    });
  }

  private readPublicPostsEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          { _id: new ObjectId(merchant_id) },
          { 'posts.access': 'public' }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
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
          { _id: new ObjectId(merchant_id) },
          { 'events.access': 'public' }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: [...posts, ...events],
      code: 200
    });
  }

  private readPrivatePostsEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    let error: Error, posts: PostEvent[], events: PostEvent[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          { _id: new ObjectId(merchant_id) },
          { 'posts.access': { $in: ['public', 'private', access] } }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$posts._id',
        post_event_imageURL: '$posts.imageURL',
        type: 'post',
        title: '$posts.title',
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
          { _id: new ObjectId(merchant_id) },
          { 'events.access': { $in: ['public', 'private', access] } }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_event_id: '$events._id',
        post_event_imageURL: '$events.imageURL',
        type: 'event',
        title: '$events.title',
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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: [...posts, ...events],
      code: 200
    });
  }

  private inviteAFriend = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: InvitationDto = request.body;
    const user: User = request.user;
    if ((await this.invitation.findOne({ receiver_email: data.receiver })) ||
      (await this.user.findOne({ email: data.receiver }))) {
      next(new UnprocessableEntityException("User has been already invited!"));
    } else {
      let error: Error, results: Object;
      [error, results] = await to(this.invitation.create({
        sender_id: user._id, receiver_email: data.receiver,
        points: 100, complete: false
      }).catch());
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.locals = {
        sender_name: user.name,
        sender_email: user.email,
        receiver_email: data.receiver
      }
      next();
    }
  }

  private emailSender = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  }
}

export default CommunityController;
