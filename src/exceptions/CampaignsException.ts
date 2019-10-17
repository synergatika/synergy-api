import HttpException from "./HttpException";
 
class CampaignsException extends HttpException {
  constructor(code: number, msg: string) {
    super(code, msg);
  }
} 
export default CampaignsException;