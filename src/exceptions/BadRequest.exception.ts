import HttpException from "./HttpException";

class BadRequest extends HttpException {
    constructor(msg: string) {
        super(400, "Bad Request: " + msg);
    }
}
export default BadRequest;