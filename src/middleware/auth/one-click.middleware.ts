import { NextFunction, Response } from 'express';

/**
 * Exceptions
 */
import { UnauthorizedException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { User } from '../../_interfaces/index';

/**
 * Models
 */
import userModel from '../../models/user.model';

async function oneClickMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {

  const params = request.params;
  if (params && params.token) {
    try {
      const token = request.params.token;

      const now = new Date();
      const seconds = parseInt(now.getTime().toString());
      const user: User = await userModel.findOne({
        oneClickToken: token, oneClickExpiration: { $gt: seconds }
      }).select({
        "_id": 1,
        "email": 1, "password": 1,
        "name": 1, "imageURL": 1,
        "account": 1, "access": 1,
        "email_verified": 1, "pass_verified": 1
      });
      if (user) {
        request.user = user;
        next();
      } else {
        next(new UnauthorizedException("Authorization Required."));
      }
    } catch (error) {
      next(new UnauthorizedException("Authorization Required."));
    }
  } else {
    next(new UnauthorizedException("Authorization Required."));
  }
}

export default oneClickMiddleware;
