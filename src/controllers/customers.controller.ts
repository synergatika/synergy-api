import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import UsersException from '../exceptions/UsersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import User from '../usersInterfaces/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
// import accessMiddleware from '../middleware/access.middleware'
// Models
import userModel from '../models/user.model';
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
        this.router.get(`${this.path}`, authMiddleware, this.readUserProfile);
        this.router.put(`${this.path}`, authMiddleware, validationMiddleware(CustomerDto), this.updateUserProfile);
    }

    private readUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            _id: request.user._id
        }, {
            verificationToken: false, verificationExpiration: false,
            restorationToken: false, restorationExpiration: false,
            offers: false, campaigns: false
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        user.password = undefined;
        response.status(200).send({
            data: user,
            code: 200
        });
    }

    private updateUserProfile = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: CustomerDto = request.body;
        let error: Error, user: User;
        [error, user] = await to(this.user.findOneAndUpdate({
            _id: request.user._id
        }, {
            $set: {
                name: data.name,
                imageURL: data.imageURL
            }
        }, {
            projection: {
                name: '$name',
                imageURL: '$imageURL'
            }
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));

        user.password = undefined;
        response.status(200).send({
            data: user,
            code: 200
        });
    }
}

export default CustomersController;
