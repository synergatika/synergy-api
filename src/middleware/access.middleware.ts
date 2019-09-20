import { NextFunction, Response } from 'express';
import AuthenticationException from '../exceptions/AuthenticationException';
import userModel from '../models/user.model';
import RequestWithUser from '../interfaces/requestWithUser.interface';


class AccessMiddleware {

    private user = userModel;

    static registerWithoutPass = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if ((user.access === 'admin') && ((request.params.access === 'merchant') || request.params.access === 'customer')) {
            next();
        } else if ((user.access === 'merchant') && (request.params.access === 'customer')) {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }

    static onlyAsAdmin = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'admin') {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }

    static onlyAsMerchant = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }

    static onlyAsCustomer = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new AuthenticationException(404, 'No Access'));
        }
    }
}
export default AccessMiddleware;
