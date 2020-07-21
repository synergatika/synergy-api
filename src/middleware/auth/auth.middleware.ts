import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Exceptions
 */
import UnauthorizedException from '../../exceptions/Unauthorized.exception';

/**
 * Interfaces
 */
import DataStoredInToken from '../../authInterfaces/dataStoredInToken';
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import User from '../../usersInterfaces/user.interface';

/**
 * Models
 */
import userModel from '../../models/user.model';

async function authMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {

  const token = request.headers;
  if (token && token.authorization) {
    const secret = process.env.JWT_SECRET;
    try {
      const verificationResponse = jwt.verify((token.authorization).replace('Bearer ', ''), secret) as DataStoredInToken;
      const id = verificationResponse._id;
      const user: User = await userModel.findById(id).select({
        "_id": 1,
        "email": 1, "password": 1,
        "name": 1, "imageURL": 1,
        "account": 1, "access": 1,
        "email_verified": 1, "pass_verified": 1,
        "createdAt": 1
        // "slug": 1,
        //"payments": 1
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

export default authMiddleware;
