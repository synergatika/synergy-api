import { HttpException } from "./HttpException";

export class UnprocessableEntityException extends HttpException {
  constructor(msg: string) {
    super(422, "Unprocessable Entity: " + msg);
  }
}
