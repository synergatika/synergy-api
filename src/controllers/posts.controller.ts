import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import { PartnerID, PostID, PostDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, Post } from '../_interfaces/index';

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
    this.router.get(`${this.path}/public/:offset`, this.readPosts);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPosts);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(PostDto), this.createPost);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPostsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPostsByStore);
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

  private readPosts = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private')
    if (request.user && request.user.access) access_filter.push('partners')
    /** ***** * ***** */

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        'posts.access': { $in: access_filter }
      }
    }, {
      $project: {
        partner: this.projectPartner(),
        ...this.projectPost()
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
          "description": data.description,
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

  private readPostsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private');
    if (request.user && request.user.access === 'partner') access_filter.push('partners');

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    /** ***** * ***** */

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          partner_filter,
          { 'posts.access': { $in: access_filter } }
        ]
      }
    }, {
      $project: {
        partner: this.projectPartner(),
        ...this.projectPost()
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

    /** Params & Filters */
    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    const post_filter = ObjectId.isValid(post_id) ? { 'posts._id': new ObjectId(post_id) } : { 'posts.slug': post_id };
    /** ***** * ***** */

    let error: Error, posts: Post[];
    [error, posts] = await to(this.user.aggregate([{
      $unwind: '$posts'
    }, {
      $match: {
        $and: [
          partner_filter,
          post_filter
        ]
      }
    }, {
      $project: {
        partner: this.projectPartner(),
        ...this.projectPost()
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
    if (currentPost['imageURL'] && request.file) {
      await this.removeFile(currentPost);
    }

    if (currentPost.contentFiles) {
      this.removeRichEditorFiles(currentPost, data, true);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'posts._id': post_id
      }, {
      '$set': {
        'posts.$._id': post_id,
        'posts.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentPost['imageURL'],
        'posts.$.title': data.title,
        'posts.$.slug': await createSlug(request),
        'posts.$.subtitle': data.subtitle,
        'posts.$.description': data.description,
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
    if (currentPost['imageURL']) {
      await this.removeFile(currentPost);
    }

    if (currentPost.contentFiles) {
      this.removeRichEditorFiles(currentPost, null, false);
    }

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

  /**
   *  
   * Local Function Section 
   *
   * */

  /** Project Partner (Local Function) */
  private projectPartner() {
    return {
      _id: '$_id',
      name: '$name',
      email: '$email',
      slug: '$slug',
      imageURL: '$imageURL',
      payments: '$payments',
      address: '$address',
      contacts: '$contacts',
      phone: '$phone',
    };
  }

  /** Project Post (Local Function) */
  private projectPost() {
    return {
      _id: '$posts._id',
      slug: '$posts.slug',
      imageURL: '$posts.imageURL',
      title: '$posts.title',
      subtitle: '$posts.subtitle',
      description: '$posts.description',

      createdAt: '$posts.createdAt',
      updatedAt: '$posts.updatedAt'
    };
  }

  /** Remove File (Local Function) */
  private async removeFile(currentPost: Post) {
    var imageFile = (currentPost['imageURL']).split('assets/static/');
    const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
    if (existFile(file)) await deleteFile(file);
  }

  /** Remove Content Files (Local Function) */
  private async removeRichEditorFiles(currentPost: Post, newPost: PostDto, isUpdated: boolean) {
    var toDelete: string[] = [];

    if (isUpdated) {
      (currentPost.contentFiles).forEach((element: string) => {
        if ((newPost.contentFiles).indexOf(element) < 0) {
          var imageFile = (element).split('assets/content/');
          const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
          toDelete.push(file);
        }
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    } else {
      (currentPost.contentFiles).forEach((element: string) => {
        var imageFile = (element).split('assets/content/');
        const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
        toDelete.push(file);
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    }
  }
}

export default PostsController;
