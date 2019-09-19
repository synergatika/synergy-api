import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import AuthenticationException from '../exceptions/AuthenticationException';
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import userModel from '../models/user.model';

async function authMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {
  const cookies = request.cookies;
  
  cookies.Authorization = 
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZDdmYTdmNmYxODExZTJhNzgyZGMyNzEiLCJpYXQiOjE1Njg4OTk2MTAsImV4cCI6MTU2ODkzNTYxMH0.-KpKGcpup3-UCcUm0gj1bgkxBZPoXpz-NSr4bImydls"
 // console.log(request.cookies);
  
  if (cookies && cookies.Authorization) {
    const secret = process.env.JWT_SECRET;
    try {
      const verificationResponse = jwt.verify(cookies.Authorization, secret) as DataStoredInToken;
      const id = verificationResponse._id;
      const user = await userModel.findById(id);
      if (user) {
        request.user = user;
        next();
      } else {
        next(new AuthenticationException(404, "Wrong or Expired Token"));
      }
    } catch (error) {
      next(new AuthenticationException(404, "Wrong or Expired Token"));
    }
  } else {
    next(new AuthenticationException(404, "Token Missing!"));
  }
}

export default authMiddleware;