import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import PostDto from '../communityDtos/post.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'
import PostID from '../communityDtos/post_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Post from '../communityInterfaces/post.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';

class PostAndEventsController implements Controller {
  public path = '/community';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public`, this.readPublicPostsAndEvents);
    this.router.get(`${this.path}/private`, authMiddleware, this.readPrivatePostsAndEvents);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(PostDto), this.createPostOrEvent);
    this.router.get(`${this.path}/public/:merchant_id`, validationParamsMiddleware(MerchantID), this.readPublicPostsAndEventsByStore);
    this.router.get(`${this.path}/private/:merchant_id`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivatePostsAndEventsByStore);
    this.router.put(`${this.path}/:merchant_id/:post_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, validationBodyMiddleware(PostDto), this.updatePostOrEvent);
    this.router.delete(`${this.path}/:merchant_id/:post_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, this.deletePostOrEvent);
  }

  private readPrivatePostsAndEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        'posts.access': { $in: ['public', 'private', access] }
      }
    }, {
      $project: {
        _id: false,
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        post_id: '$posts._id',
        type: '$posts.type',
        content: '$posts.content',
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
      data: posts,
      code: 200
    });
  }

  private readPublicPostsAndEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        'posts.access': 'public'
      }
    }, {
      $project: {
        _id: false,
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        post_id: '$posts._id',
        type: '$posts.type',
        content: '$posts.content',
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
      data: posts,
      code: 200
    });
  }

  private createPostOrEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: PostDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: user._id
    }, {
        $push: {
          posts: {
            "access": data.access,
            "type": data.type,
            "content": data.content
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! A new offer has been created!",
      code: 201
    });
  }

  private readPrivatePostsAndEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    let error: Error, posts: Post[];
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
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        post_id: '$posts._id',
        content: '$posts.content',
        type: '$posts.type',
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
      data: posts,
      code: 200
    });
  }

  private readPublicPostsAndEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    let error: Error, posts: Post[];
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
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        post_id: '$posts._id',
        content: '$posts.content',
        type: '$posts.type',
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
      data: posts,
      code: 200
    });
  }

  private updatePostOrEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
    const post_id: PostID["post_id"] = request.params.post_id;
    const data: PostDto = request.body;

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: merchant_id,
        'posts._id': post_id
      }, {
        '$set': {
          'posts.$._id': post_id,
          'posts.$.content': data.content,
          'posts.$.access': data.access,
          'posts.$.type': data.type
        }
      }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Post/Event " + post_id + " has been updated!",
      code: 200
    });
  }

  private deletePostOrEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
    const post_id: PostID["post_id"] = request.params.offer_id;

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id
    }, {
        $pull: {
          posts: {
            _id: post_id
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Post/Event " + post_id + " has been deleted!",
      code: 200
    });
  }
}

export default PostAndEventsController;
