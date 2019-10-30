import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';

import RequestWithUser from '../interfaces/requestWithUser.interface';
import ForbiddenException from '../exceptions/Forbidden.exception';
import userModel from '../models/user.model';


class AccessMiddleware {

    private user = userModel;

    static registerWithoutPass = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if ((user.access === 'admin') && ((request.params.access === 'merchant') || request.params.access === 'customer')) {
            next();
        } else if ((user.access === 'merchant') && (request.params.access === 'customer')) {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsAdmin = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'admin') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsMerchant = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsCustomer = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static confirmPassword = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const data = request.body;
        const user = request.user;
        if (await bcrypt.compare(data.password, user.password)) {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }
}
export default AccessMiddleware;
