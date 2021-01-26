import HttpException from "./HttpException";

class UnprocessableEntity extends HttpException {
  constructor(msg: string) {
    super(422, "Unprocessable Entity: " + msg);
    console.log("Error", msg)
  }
}
export default UnprocessableEntity;
