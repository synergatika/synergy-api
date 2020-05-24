import * as express from 'express';
import to from 'await-to-ts'
import path from 'path';

// Dtos
import MemberDto from '../usersDtos/member.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Member from '../usersInterfaces/member.interface';
// Middleware
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import FilesMiddleware from '../middleware/files.middleware';
// Helper's Instance
const uploadFile = FilesMiddleware.uploadPerson;
const deleteFile = FilesMiddleware.deleteFile;
// Models
import userModel from '../models/user.model';

class MembersController implements Controller {
  public path = '/profile';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.readUserProfile);
    this.router.put(`${this.path}`, authMiddleware, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(MemberDto), this.updateUserProfile);
  }

  private readUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, member: Member;
    [error, member] = await to(this.user.findOne({
      _id: user._id
    }).select({
      "id": 1, "email": 1,
      "name": 1, "imageURL": 1,
      "createdAt": 1
    }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      data: member,
      code: 200
    });
  }

  private updateUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: MemberDto = request.body;
    const user: User = request.user;

    if ((user.imageURL && (user.imageURL).includes(user._id)) && request.file) {
      //if (user.imageURL && request.file) {
      var imageFile = (user.imageURL).split('assets/profile/');
      await deleteFile(path.join(__dirname, '../assets/profile/' + imageFile[1]));
    }

    let error: Error, member: Member;
    [error, member] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
      $set: {
        name: data.name,
        imageURL: (request.file) ? `${process.env.API_URL}assets/profile/${request.file.filename}` : user.imageURL
      }
    }, {
      "fields": { "name": 1, "imageURL": 1 },
      "new": true
    }).catch());

    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      data: member,
      code: 200
    });
  }
}

export default MembersController;
