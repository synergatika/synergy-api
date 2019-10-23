import HttpException from "./HttpException";

class NotFound extends HttpException {
    constructor(msg: string) {
        super(404, "Not Found: " + msg);
    }
}
export default NotFound;