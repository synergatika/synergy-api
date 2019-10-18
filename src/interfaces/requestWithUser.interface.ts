import { Request } from 'express';
import User from 'usersInterfaces/user.interface';
 
interface RequestWithUser extends Request {
  user: User;
}
 
export default RequestWithUser;