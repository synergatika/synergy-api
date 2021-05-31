import { HttpException } from "./HttpException";

export class ForbiddenException extends HttpException {
    constructor(msg: string) {
        super(403, "Forbidden: " + msg);
    }
}