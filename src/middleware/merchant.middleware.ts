import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Models
import userModel from '../models/user.model';

async function merchantMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {
  const merchant_id: string = request.params.merchant_id;

  let error: Error, merchant: User;
  [error, merchant] = await to(userModel.findOne({
    _id: new ObjectId(merchant_id)
  }).select({
    "_id": 1, "payments": 1
  }).catch());


  if (error) return next(new UnprocessableEntityException('DB ERROR'));
  else if (!merchant) {// Have to create a customer (/auth/register/customer) and then transfer points
    response.status(200).send({
      message: "user_not_exists",
      code: 204
    });
  } else {
    response.locals = {
      merchant: merchant
    }
    next();
  }
}
export default merchantMiddleware;
