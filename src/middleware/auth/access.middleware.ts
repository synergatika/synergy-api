import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';

/**
 * Exceptions
 */
import { ForbiddenException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { User, UserAccess } from '../../_interfaces/index';

/**
 * Models
 */
import userModel from '../../models/user.model';

class AccessMiddleware {

  // static registerPartner = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const user: User = request.user;
  //   if (user.access === 'admin') {
  //     next();
  //   } else {
  //     next(new ForbiddenException('Access to that resource is forbidden.'));
  //   }
  // }

  // static registerMember = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const user: User = request.user;
  //   if ((user.access === 'admin') || (user.access === 'partner')) {
  //     next();
  //   } else {
  //     next(new ForbiddenException('Access to that resource is forbidden.'));
  //   }
  // }

  static onlyAsAdmin = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const user: User = request.user;
    if (user.access === UserAccess.ADMIN) {
      next();
    } else {
      next(new ForbiddenException('Access to that resource is forbidden.'));
    }
  }

  static onlyAsPartner = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const user: User = request.user;
    if (user.access === UserAccess.PARTNER) {
      next();
    } else {
      next(new ForbiddenException('Access to that resource is forbidden.'));
    }
  }

  static onlyAsAdminOrPartner = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const user: User = request.user;
    if ((user.access === UserAccess.ADMIN) || (user.access === UserAccess.PARTNER)) {
      next();
    } else {
      next(new ForbiddenException('Access to that resource is forbidden.'));
    }
  }

  static onlyAsMember = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const user: User = request.user;
    if (user.access === UserAccess.MEMBER) {
      next();
    } else {
      next(new ForbiddenException('Access to that resource is forbidden.'));
    }
  }

  static belongsTo = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const user: User = request.user;
    if ((user._id).toString() === (request.params.partner_id).toString()) {
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
}
export default AccessMiddleware;
