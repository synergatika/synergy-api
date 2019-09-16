import HttpException from "./HttpException";

class AuthenticationException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, "UserError: " + msg);
  }
}
export default AuthenticationException;