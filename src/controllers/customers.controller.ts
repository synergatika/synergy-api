import * as express from 'express';
import to from 'await-to-ts'

// Dtos
import CustomerDto from '../usersDtos/customer.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import User from '../usersInterfaces/user.interface';
import Customer from '../usersInterfaces/customer.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import authMiddleware from '../middleware/auth.middleware';
// Models
import userModel from '../models/user.model';


class CustomersController implements Controller {
  public path = '/profile';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.readUserProfile);
    this.router.put(`${this.path}`, authMiddleware, validationBodyMiddleware(CustomerDto), this.updateUserProfile);
  }

  private readUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;

    let error: Error, customer: Customer;
    [error, customer] = await to(this.user.findOne({
      _id: user._id
    }, {
      access: false,
      email_verified: false, pass_verified: false,
      verificationToken: false, verificationExpiration: false,
      restorationToken: false, restorationExpiration: false,
      offers: false, campaigns: false,
      updatedAt: false
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

    let error: Error, customer: Customer;
    [error, customer] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
      $set: {
        name: data.name,
        imageURL: data.imageURL
      }
    }, {
      projection: {
        email: '$email',
        createdAt: '$createdAt',
        name: '$name',
        imageURL: '$imageURL'
      }
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    customer.password = undefined;
    response.status(200).send({
      data: customer,
      code: 200
    });
  }
}

export default CustomersController;
