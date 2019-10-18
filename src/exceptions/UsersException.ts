import HttpException from "./HttpException";

class UsersException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, "UserError: " + msg);
  }
}
export default UsersException;