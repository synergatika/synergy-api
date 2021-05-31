import { Request } from 'express';
import { User } from '../_interfaces/index';

interface RequestWithUser extends Request {
  user: User;
}

export default RequestWithUser;