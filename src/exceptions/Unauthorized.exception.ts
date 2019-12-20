import HttpException from "./HttpException";

class Unauthorized extends HttpException {
    constructor(msg: string) {
        super(401, "Unauthorized: " + msg);
    }
}
export default Unauthorized;