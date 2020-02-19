import * as express from 'express';
import to from 'await-to-ts'

// Dtos
import CustomerDto from '../usersDtos/customer.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Customer from '../usersInterfaces/customer.interface';
// Middleware
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function(req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/profile'));
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

class CustomersController implements Controller {
  public path = '/profile';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.readUserProfile);
    this.router.put(`${this.path}`, authMiddleware, upload.single('imageURL'), validationBodyAndFileMiddleware(CustomerDto), this.updateUserProfile);
  }

  private readUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, customer: Customer;
    [error, customer] = await to(this.user.findOne({
      _id: user._id
    }).select({
      "id": 1, "email": 1,
      "name": 1, "imageURL": 1,
      "createdAt": 1
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    customer.password = undefined;
    response.status(200).send({
      data: customer,
      code: 200
    });
  }

  private updateUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CustomerDto = request.body;
    const user: User = request.user;

    if (user.imageURL && request.file) {
      var imageFile = (user.imageURL).split('assets/profile/');
      await unlinkAsync(path.join(__dirname, '../assets/profile/' + imageFile[1]));
    }

    let error: Error, customer: Customer;
    [error, customer] = await to(this.user.findOneAndUpdate({
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

    if (error) next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      data: customer,
      code: 200
    });
  }
}

export default CustomersController;
