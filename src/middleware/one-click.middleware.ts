import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';

// Exceptions
import UnauthorizedException from '../exceptions/Unauthorized.exception';
// Interfaces
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';

// Models
import userModel from '../models/user.model';

async function oneClickMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {

  const params = request.params;
  console.log(params);
  if (params && params.token) {
    try {
      const token = request.params.token;

      const now = new Date();
      const seconds = parseInt(now.getTime().toString());
      const user: User = await userModel.findOne({ oneClickToken: token, oneClickExpiration: { $gt: seconds } }).select({
        "_id": 1,
        "email": 1, "password": 1,
        "name": 1, "imageURL": 1,
        "account": 1, "access": 1,
        "email_verified": 1, "pass_verified": 1
      });
      if (user) {
        request.user = user;
        console.log("HERE", request.user);
        next();
      } else {
        console.log("Error_1")
        next(new UnauthorizedException("Authorization Required."));
      }
    } catch (error) {
      console.log("Error_2", error)
      next(new UnauthorizedException("Authorization Required."));
    }
  } else {
    console.log("Error_3")
    next(new UnauthorizedException("Authorization Required."));
  }
}

export default oneClickMiddleware;
