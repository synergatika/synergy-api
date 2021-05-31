import { HttpException } from "./HttpException";

export class UnauthorizedException extends HttpException {
    constructor(msg: string) {
        super(401, "Unauthorized: " + msg);
    }
}