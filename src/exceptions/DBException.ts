import HttpException from "./HttpException";
 
class DBException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, msg);
  }
} 
export default DBException;