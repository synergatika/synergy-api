import * as express from 'express';
import to from 'await-to-ts';
import path from 'path';
import { ObjectId } from 'mongodb';

// Email Service
import EmailService from '../utils/emailService';
const emailService = new EmailService();

// Dtos
import UserID from '../usersDtos/user_id.params.dto';
import AccessDto, { Access } from '../usersDtos/access.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';
// Interfaces
import User from '../usersInterfaces/user.interface';
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
//import Content from '../contentInterfaces/content.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import OffsetHelper from '../middleware/offset.helper';
// Helper's Instance
const offsetParams = OffsetHelper.offsetLimit;
// Models
import userModel from '../models/user.model';

class UserController implements Controller {
  public path = '/users';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:access/:offset`, authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(AccessDto), this.readUsers);
    this.router.put(`${this.path}/reactivate/:user_id`, authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(UserID), this.reactivateUser, emailService.accountReactivation);
  }

  private readUsers = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access: AccessDto['access'] = request.params.access as Access;
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, users: User[];
    [error, users] = await to(this.user.find({ access: access }).select({
      "_id": 1,
      "email": 1, "card": 1,
      "name": 1, "imageURL": 1,
      "activated": 1, "createdAt": 1
    }).sort('-createdAt')
      .limit(offset.limit).skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: users,
      code: 200
    });
  }

  private reactivateUser = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user_id: UserID["user_id"] = request.params.user_id;

    if (await this.user.findOne({ _id: user_id, activated: true })) {
      next(new NotFoundException("USER_ACTIVATED"));
    }

    let error: Error, user: User; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, user] = await to(this.user.findOneAndUpdate({
      _id: user_id
    }, {
      $set: {
        'activated': true
      }
    }, {
      "fields": { "email": 1, "name": 1, "acceess": 1 },
      "new": true
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          message: "Account has been successfully activated.",
          code: 200
        }
      },
      user: {
        email: user.email
      }
    };
    next();
  }
}

export default UserController;
