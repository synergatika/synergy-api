import HttpException from "./HttpException";
 
class AuthenticationException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, "AuthentiationError: " + msg);
  }
} 
export default AuthenticationException;