import { HttpException } from "./HttpException";

export class BadRequestException extends HttpException {
    constructor(msg: string) {
        super(400, "Bad Request: " + msg);
    }
}