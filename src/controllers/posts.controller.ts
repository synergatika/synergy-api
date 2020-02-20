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
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Post from '../communityInterfaces/post.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function(req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/items'));
  },
  filename: function(req: RequestWithUser, file, cb) {

    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

class PostsController implements Controller {
  public path = '/posts';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset?`, this.readPublicPosts);
    this.router.get(`${this.path}/private/:offset?`, authMiddleware, this.readPrivatePosts);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, upload.single('imageURL'), validationBodyAndFileMiddleware(PostDto), this.createPost);
    this.router.get(`${this.path}/public/:merchant_id/:offset?`, validationParamsMiddleware(MerchantID), this.readPublicPostsByStore);
    this.router.get(`${this.path}/private/:merchant_id/:offset?`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivatePostsByStore);
    this.router.get(`${this.path}/:merchant_id/:post_id`, validationParamsMiddleware(PostID), this.readPost);
    this.router.put(`${this.path}/:merchant_id/:post_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(PostDto), itemsMiddleware.postMiddleware, this.updatePost);
    this.router.delete(`${this.path}/:merchant_id/:post_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, itemsMiddleware.postMiddleware, this.deletePost);
  }

  // offset: [number, number, number] = [items per page, current page, active or all]
  private offsetParams = (params: string) => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }

  private readPrivatePosts = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        createdAt: '$posts.createdAt',
        updatedAt: '$posts.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPublicPosts = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        createdAt: '$posts.createdAt',
        updatedAt: '$posts.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private createPost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: PostDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: user._id
    }, {
        $push: {
          posts: {
            "imageURL": (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : '',
            "title": data.title,
            "content": data.content,
            "access": data.access
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! A new Post has been created!",
      code: 201
    });
  }

  private readPrivatePostsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        createdAt: '$posts.createdAt',
        updatedAt: '$posts.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPublicPostsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        createdAt: '$posts.createdAt',
        updatedAt: '$posts.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPost = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
    const post_id: PostID["post_id"] = request.params.post_id;

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          { _id: new ObjectId(merchant_id) },
          { 'posts._id': new ObjectId(post_id) }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        createdAt: '$posts.createdAt'
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: posts[0],
      code: 200
    });
  }

  private updatePost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
    const post_id: PostID["post_id"] = request.params.post_id;
    const data: PostDto = request.body;

    const currentPost: Post = response.locals.post;
    if (currentPost.post_imageURL && request.file) {
      var imageFile = (currentPost.post_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: merchant_id,
        'posts._id': post_id
      }, {
        '$set': {
          'posts.$._id': post_id,
          'posts.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentPost.post_imageURL,
          'posts.$.title': data.title,
          'posts.$.content': data.content,
          'posts.$.access': data.access,
        }
      }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Post " + post_id + " has been updated!",
      code: 200
    });
  }

  private deletePost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
    const post_id: PostID["post_id"] = request.params.post_id;

    const currentPost: Post = response.locals.post;
    if (currentPost.post_imageURL) {
      var imageFile = (currentPost.post_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

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
      message: "Success! Post " + post_id + " has been deleted!",
      code: 200
    });
  }
}

export default PostsController;
