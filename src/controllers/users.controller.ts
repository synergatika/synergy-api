import * as express from 'express';
import to from 'await-to-ts';
// import path from 'path';
// import { ObjectId } from 'mongodb';

/**
 * Emails Util
 */
// import EmailsUtil from '../utils/email.util';
// const emailsUtil = new EmailsUtil();

/**
 * DTOs
 */
import { AccessDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, UserAccess } from '../_interfaces/index';

/**
 * Middleware
 */
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';

class UserController implements Controller {
  public path = '/users';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:access/:offset`,
      authMiddleware, accessMiddleware.onlyAsAdmin,
      validationParamsMiddleware(AccessDto),
      this.readUsers);
  }

  private readUsers = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access: AccessDto['access'] = request.params.access as UserAccess;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, users: User[];
    [error, users] = await to(userModel.find({
      access: access
    }).select({
      "_id": 1,
      "address": 1,
      "email": 1,
      "card": 1,
      "name": 1,
      "imageURL": 1,
      "activated": 1,
      "createdAt": 1
    }).sort({ "createdAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: users,
      code: 200
    });
  }
}

export default UserController;
