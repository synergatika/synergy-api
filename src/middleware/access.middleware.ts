import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';

// Dtos
import AccessDto from '../authDtos/access.params.dto';
// Exceptions
import ForbiddenException from '../exceptions/Forbidden.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Models
import userModel from '../models/user.model';



class AccessMiddleware {

    private user = userModel;

    static registerWithoutPass = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user: User = request.user;
        const access: AccessDto["access"] = request.params.access;
        if ((user.access === 'admin') && ((access === 'merchant') || access === 'customer')) {
            next();
        } else if ((user.access === 'merchant') && (access === 'customer')) {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsAdmin = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user: User = request.user;
        if (user.access === 'admin') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsMerchant = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user: User = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static onlyAsCustomer = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user: User = request.user;
        if (user.access === 'merchant') {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static confirmPassword = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const data = request.body;
        const user: User = request.user;
        if (await bcrypt.compare(data.password, user.password)) {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }

    static belongsTo = async (request: RequestWithUser, response: Response, next: NextFunction) => {
        const user: User = request.user;
        if ((user._id).toString() === (request.params.merchant_id).toString()) {
            next();
        } else {
            next(new ForbiddenException('Access to that resource is forbidden.'));
        }
    }
}
export default AccessMiddleware;
