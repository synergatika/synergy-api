import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import PostDto from '../communityDtos/post.dto'
import PartnerID from '../usersDtos/partner_id.params.dto'
import PostID from '../communityDtos/post_id.params.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Post from '../communityInterfaces/post.interface';

/**
 * Middlewares
 */
import validationParamsMiddleware from '../middleware/validators/params.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.postSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';

class PostsController implements Controller {
  public path = '/posts';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPublicPosts);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPrivatePosts);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(PostDto), this.createPost);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPublicPostsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPrivatePostsByStore);
    this.router.get(`${this.path}/:partner_id/:post_id`, validationParamsMiddleware(PostID), this.readPost);
    this.router.put(`${this.path}/:partner_id/:post_id`, authMiddleware, accessMiddleware.onlyAsPartner, this.declareStaticPath, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(PostDto), itemsMiddleware.postMiddleware, this.updatePost);
    this.router.delete(`${this.path}/:partner_id/:post_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, itemsMiddleware.postMiddleware, this.deletePost);

    this.router.post(`${this.path}/image`, authMiddleware, this.declareContentPath, uploadFile.array('content_image', 8), this.uploadContentImage);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'post';
    next();
  }

  private declareContentPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'content';
    request.params['type'] = 'post';
    next();
  }

  private uploadContentImage = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: {
        files: request.files,
        path: `${process.env.API_URL}assets/content/`
      },
      success: true
    });
  }

  private readPrivatePosts = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

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
        partner_id: '$_id',
        partner_name: '$name',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_slug: '$posts.slug',
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPublicPosts = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

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
        partner_id: '$_id',
        partner_name: '$name',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',

        post_id: '$posts._id',
        post_slug: '$posts.slug',
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
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
            "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
            "title": data.title,
            "subtitle": data.subtitle,
            "slug": await createSlug(request),
            "content": data.content,
            "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : 0,
            "access": data.access
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(201).send({
      message: "Success! A new Post has been created!",
      code: 201
    });
  }

  private readPrivatePostsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, posts: Post[];
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

        post_id: '$posts._id',
        post_slug: '$posts.slug',
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPublicPostsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, posts: Post[];
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

        post_id: '$posts._id',
        post_slug: '$posts.slug',
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
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: posts,
      code: 200
    });
  }

  private readPost = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PostID["partner_id"] = request.params.partner_id;
    const post_id: PostID["post_id"] = request.params.post_id;

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'posts._id': ObjectId.isValid(post_id) ? new ObjectId(post_id) : new ObjectId() }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'posts.slug': post_id }
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

        post_id: '$posts._id',
        post_slug: '$posts.slug',
        post_imageURL: '$posts.imageURL',
        title: '$posts.title',
        subtitle: '$posts.subtitle',
        content: '$posts.content',

        access: '$posts.access',
        contentFiles: '$posts.contentFiles',
        createdAt: '$posts.createdAt'
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!posts.length) {
      return next(new NotFoundException('POST_NOT_EXISTS'));
    }

    response.status(200).send({
      data: posts[0],
      code: 200
    });
  }

  private updatePost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PostID["partner_id"] = request.params.partner_id;
    const post_id: PostID["post_id"] = request.params.post_id;
    const data: PostDto = request.body;

    const currentPost: Post = response.locals.post;
    if (currentPost['post_imageURL'] && request.file) {
      var imageFile = (currentPost['post_imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }

    if (currentPost.contentFiles) {
      var toDelete: string[] = [];
      (currentPost.contentFiles).forEach((element: string) => {
        if ((data.contentFiles).indexOf(element) < 0) {
          var imageFile = (element).split('assets/content/');
          const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
          toDelete.push(file);
        }
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    }

    // const currentPost: Post = response.locals.post;
    // if ((currentPost.post_imageURL && (currentPost.post_imageURL).includes(partner_id)) && request.file) {
    //   //if (currentPost.post_imageURL && request.file) {
    //   var imageFile = (currentPost.post_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'posts._id': post_id
      }, {
        '$set': {
          'posts.$._id': post_id,
          'posts.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentPost.post_imageURL,
          'posts.$.title': data.title,
          'posts.$.slug': await createSlug(request),
          'posts.$.subtitle': data.subtitle,
          'posts.$.content': data.content,
          'posts.$.contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : 0,
          'posts.$.access': data.access,
        }
      }).catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Post " + post_id + " has been updated!",
      code: 200
    });
  }

  private deletePost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PostID["partner_id"] = request.params.partner_id;
    const post_id: PostID["post_id"] = request.params.post_id;

    const currentPost: Post = response.locals.post;
    if (currentPost['post_imageURL']) {
      var imageFile = (currentPost['post_imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }

    if (currentPost.contentFiles) {
      var toDelete: string[] = [];
      (currentPost.contentFiles).forEach((element: string) => {
        var imageFile = (element).split('assets/content/');
        const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
        toDelete.push(file);
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    }
    // const currentPost: Post = response.locals.post;
    // if (currentPost.post_imageURL && (currentPost.post_imageURL).includes(partner_id)) {
    //   //if (currentPost.post_imageURL) {
    //   var imageFile = (currentPost.post_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: partner_id
    }, {
        $pull: {
          posts: {
            _id: post_id
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Post " + post_id + " has been deleted!",
      code: 200
    });
  }
}

export default PostsController;
