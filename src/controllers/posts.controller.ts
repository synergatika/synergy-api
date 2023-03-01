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
import { User, Post, Partner, ItemAccess } from '../_interfaces/index';

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
// const uploadFile = FilesMiddleware.uploadFile;
const uploadFile = FilesMiddleware.uploadFile;
// const existFile = FilesMiddleware.existsFile;
// const deleteFile = FilesMiddleware.deleteFile;
// const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.postSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import postModel from '../models/post.model';

/**
 * Files Util
 */
import FilesUtil from '../utils/files.util';
const filesUtil = new FilesUtil();

class PostsController implements Controller {
  public path = '/posts';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPosts);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPosts);

    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner,
      // this.declareStaticPath, 
      uploadFile('static', 'post').single('imageURL'),
      validationBodyAndFileMiddleware(PostDto), this.createPost);

    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPostsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPostsByStore);
    this.router.get(`${this.path}/:partner_id/:post_id`, validationParamsMiddleware(PostID), this.readPost);

    this.router.put(`${this.path}/:partner_id/:post_id`, authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(PostID), accessMiddleware.belongsTo,
      uploadFile('static', 'post').single('imageURL'),
      validationBodyAndFileMiddleware(PostDto), itemsMiddleware.postMiddleware, this.updatePost);

    this.router.delete(`${this.path}/:partner_id/:post_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(PostID), accessMiddleware.belongsTo, itemsMiddleware.postMiddleware, this.deletePost);

    this.router.post(`${this.path}/image`,
      authMiddleware,
      uploadFile('content', 'post').array('content_image', 8), this.uploadContentImages);
  }

  /** 
   * 
   * Secondary Functions 
   * 
   */
  private checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  /**
   * 
   * Main Functions (Route: `/posts`)
   * 
   */

  private uploadContentImages = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
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

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE)
    if (request.user && request.user.access) access_filter.push(ItemAccess.PARTNERS)
    /** ***** * ***** */

    let error: Error, posts: Post[];
    [error, posts] = await to(postModel.find({
      "$and": [
        { "access": { "$in": access_filter } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: posts.filter(o => (o['partner'] as Partner).activated),
      code: 200
    });
  }

  private createPost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: PostDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object;
    [error, results] = await to(postModel.create({
      ...data,
      "partner": user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
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

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access === 'partner') access_filter.push(ItemAccess.PARTNERS);

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };

    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(userModel.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, posts: Post[];
    [error, posts] = await to(postModel.find({
      $and: [
        { 'partner': _user },
        { 'access': { "$in": access_filter } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
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
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { "_id": new ObjectId(partner_id) } : { "slug": partner_id };
    const post_filter = this.checkObjectIdValidity(post_id) ? { "_id": new ObjectId(post_id) } : { "slug": post_id };
    /** ***** * ***** */

    let error: Error, post: Post;
    [error, post] = await to(postModel.findOne(
      post_filter
    ).populate([{
      "path": 'partner'
    }])
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: post,
      code: 200
    });
  }

  private updatePost = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PostID["partner_id"] = request.params.partner_id;
    const post_id: PostID["post_id"] = request.params.post_id;
    const data: PostDto = request.body;

    const currentPost: Post = response.locals.post;
    if (currentPost["imageURL"] && request.file) {
      await filesUtil.removeFile(currentPost);
    }

    if (currentPost.contentFiles) {
      filesUtil.removeRichEditorFiles(currentPost, (data.contentFiles) ? data.contentFiles.split(',') : [], true);
    }

    let error: Error, post: Post;
    [error, post] = await to(postModel.findOneAndUpdate({
      "_id": new ObjectId(post_id)
    }, {
      "$set": {
        ...data,
        "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentPost['imageURL'],
        "slug": await createSlug(request),
        "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
      }
    }, {
      "new": true
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
    if (currentPost["imageURL"]) {
      await filesUtil.removeFile(currentPost);
    }

    if (currentPost.contentFiles) {
      filesUtil.removeRichEditorFiles(currentPost, currentPost.contentFiles, false);
    }

    let error: Error, results: Object;
    [error, results] = await to(postModel.findOneAndDelete({ "_id": new ObjectId(post_id) }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Post " + post_id + " has been deleted!",
      code: 200
    });
  }
}

export default PostsController;