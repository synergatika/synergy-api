import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';

// Exceptions
import ForbiddenException from '../exceptions/Forbidden.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
// Models
import userModel from '../models/user.model';

class OffsetHelper {

  // offset: [number, number, number] = [items per page, current page, active or all]
  static offsetLimit = (params: string) => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }

  static offseIndex = (params: string) => {
    if (!params) return { index: 0, count: Number.MAX_SAFE_INTEGER, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      index: parseInt(splittedParams[0]) * parseInt(splittedParams[1]),
      count: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : parseInt(splittedParams[0]),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }
}
export default OffsetHelper;
