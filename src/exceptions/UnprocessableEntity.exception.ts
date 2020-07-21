import HttpException from "./HttpException";

class UnprocessableEntity extends HttpException {
  constructor(msg: string) {
    super(422, "Unprocessable Entity: " + msg);
  }
}
export default UnprocessableEntity;
