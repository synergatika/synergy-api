import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

/**
 * Exceptions
 */
import UnprocessableEntityException from '../../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import Member from '../../usersInterfaces/member.interface';
import Partner from '../../usersInterfaces/partner.interface';

/**
 * Models
 */
import userModel from '../../models/user.model';

async function member(request: RequestWithUser, response: Response, next: NextFunction) {
  const _to: string = request.params._to;

  let error: Error, member: Member;
  [error, member] = await to(userModel.findOne({
    $or: [{ email: _to }, { card: _to }, { _id: ObjectId.isValid(_to) ? new ObjectId(_to) : new ObjectId() }]
  }).select({
    "_id": 1, "account": 1,
    "email": 1, "card": 1,
    "activated": 1
  }).catch());


  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!member) {
    return next(new NotFoundException('MEMBER_NOT_EXISTS'));
  } else if (!member.activated) {
    return next(new NotFoundException('MEMBER_INACTIVATED'))
  }

  response.locals["member"] = member;
  next();
}

async function partner(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: string = request.params.partner_id || request.user._id;

  let error: Error, partner: Partner;
  [error, partner] = await to(userModel.findOne({
    _id: new ObjectId(partner_id), access: 'partner'
  }).select({
    "_id": 1, "payments": 1,
    "activated": 1
  }).catch());


  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!partner) {
    return next(new NotFoundException('PARTNER_NOT_EXISTS'));
  } else if (!partner.activated) {
    return next(new NotFoundException('PARTNER_INACTIVATED'))
  }

  response.locals["partner"] = partner;
  next();
}

export default {
  member: member,
  partner: partner
}
