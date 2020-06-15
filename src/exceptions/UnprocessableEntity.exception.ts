import HttpException from "./HttpException";

class UnprocessableEntity extends HttpException {
  constructor(msg: string) {
    console.log(msg)
    super(422, "Unprocessable Entity: " + msg);
  }
}
export default UnprocessableEntity;
