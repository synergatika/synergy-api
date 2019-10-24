import * as express from 'express';
import * as mongoose from 'mongoose';
import to from 'await-to-ts';

// Interfaces
import Controller from '../interfaces/controller.interface';
// Exceptions
import NotFoundException from '../exceptions/NotFound.exception';

class HelpController implements Controller {
    public path = '/status';
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}`, this.establishing);
    }

    private establishing = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        const {
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_USER,
            DB_PASSWORD
        } = process.env;

        let start_time = new Date().getTime(), end_time = 0;
        let error, conn;
        [error, conn] = await to(mongoose.connect('mongodb://' + DB_USER + ':' + DB_PASSWORD + '@' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME, {
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        }).catch());
        end_time = new Date().getTime();
        if (error) next(new NotFoundException('Error Connection Fail'));
        response.status(200).send({
            data: {
                db_connection_status: "OK",
                db_time_to_connect: (end_time - start_time) + "ms",
                api_version: process.env.API_VERSION
            },
            code: 200
        });
    }
}
export default HelpController;
