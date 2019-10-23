import HttpException from "./HttpException";

class Forbidden extends HttpException {
    constructor(msg: string) {
        super(403, "Unauthorized: " + msg);
    }
}
export default Forbidden;