import HttpException from "./HttpException";
 
class AuthenticationException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, msg);
  }
} 
export default AuthenticationException;