import { NextFunction, Response } from 'express';
import AuthenticationException from '../exceptions/AuthenticationException';
import userModel from '../models/user.model';
import RequestWithUser from '../interfaces/requestWithUser.interface';


class AccessMiddleware {

    private user = userModel;

    static onlyAsAdmin = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = await userModel.findOne({ _id: request.user._id, access: 'admin' });
        if (user) {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }

    static onlyAsMerchant = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = await userModel.findOne({ _id: request.user._id, access: 'merchant' });
        if (user) {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }
    
    static onlyAsCustomer = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = await userModel.findOne({ _id: request.user._id, access: 'customer' });
        if (user) {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }
}
export default AccessMiddleware;
