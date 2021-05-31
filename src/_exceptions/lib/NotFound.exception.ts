import { HttpException } from "./HttpException";

export class NotFoundException extends HttpException {
    constructor(msg: string) {
        super(404, "Not Found: " + msg);
    }
}