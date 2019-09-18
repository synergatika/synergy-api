import * as express from 'express';

// Exceptions
import UsersException from '../exceptions/UsersException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import User from '../users/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware'
// Models
import userModel from '../users/users.model';
// Dtos
import CustomerDto from '../usersDtos/merchant.dto'

class CustomersController implements Controller {
    public path = '/profile';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}`, authMiddleware, this.getLoggedInUserInfo);
        this.router.put(`${this.path}`, authMiddleware, this.updateLoggedInUserInfo);
    }

    private getLoggedInUserInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const customer = this.user.findOne({ _id: request.user._id })
        response.send(customer);
    }

    private updateLoggedInUserInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: CustomerDto = request.body;
        this.user.findOneAndUpdate(
            {
                _id: request.user._id
            },
            {
                $set: {
                    name: data.name,
                    imageURL: data.imageURL
                }
            }, { new: true })
            .then((user) => {
                if (user) {
                    user.password = undefined;
                    response.send(user);
                } else {
                    next(new UsersException(404, 'No user'));
                }
            });
    }
}

export default CustomersController;
