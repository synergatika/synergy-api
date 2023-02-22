import * as express from 'express';
import to from 'await-to-ts'
import path from 'path';

/**
 * DTOs
 */
import { MemberDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, Member } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import FilesMiddleware from '../middleware/items/files.middleware';

/**
 * Helper's Instance
 */
// const uploadFile = FilesMiddleware.uploadFile;
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;

/**
 * Models
 */
import userModel from '../models/user.model';

class MembersController implements Controller {
  public path = '/profile';
  public router = express.Router();

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`,
      authMiddleware,
      this.readUserProfile);

    this.router.put(`${this.path}`,
      authMiddleware,
      uploadFile('static', 'member').single('imageURL'),
      validationBodyAndFileMiddleware(MemberDto),
      this.updateUserProfile);
  }

  private readUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, member: Member;
    [error, member] = await to(userModel.findOne({
      _id: user._id
    }).select({
      "id": 1, "email": 1,
      "name": 1, "imageURL": 1,
      "createdAt": 1
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: member,
      code: 200
    });
  }

  private updateUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: MemberDto = request.body;
    const user: User = request.user;

    if (user['imageURL'] && request.file) {
      var imageFile = (user['imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }

    let error: Error, member: Member;
    [error, member] = await to(userModel.findOneAndUpdate({
      "_id": user._id
    }, {
      "$set": {
        "name": data.name,
        "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : user.imageURL
      }
    }, {
      "fields": { "name": 1, "imageURL": 1 },
      "new": true
    }).catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: member,
      code: 200
    });
  }
}

export default MembersController;
