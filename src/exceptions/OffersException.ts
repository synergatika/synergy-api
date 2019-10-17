import HttpException from "./HttpException";
 
class OffersException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, msg);
  }
} 
export default OffersException;