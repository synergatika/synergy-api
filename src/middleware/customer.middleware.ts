import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';
import to from 'await-to-ts'

// Dtos
import EarnPointsDto from '../loyaltyDtos/earnPoints.dto';
import RedeemPointsDto from '../loyaltyDtos/redeemPoints.dto';
import IdentifierDto from '../loyaltyDtos/identifier.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Models
import userModel from '../models/user.model';

async function customerMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {
  const _to: string = request.body._to || request.params._to;

  let error: Error, customer: User;
  [error, customer] = await to(userModel.findOne({
    $or: [{
      email: _to
    }, {
      card: _to
    }]
  }).select({
    "_id": 1, "account": 1,
    "email": 1, "card": 1
  }).catch());


  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (!customer) {// Have to create a customer (/auth/register/customer) and then transfer points
    response.status(200).send({
      message: "user_not_exists",
      code: 204
    });
  } else {
    response.locals = {
      customer: customer
    };
    next();
  }
}
export default customerMiddleware;
