import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as mongoose from 'mongoose';
import Controller from './interfaces/controller.interface';
import * as cookieParser from 'cookie-parser';
import errorMiddleware from './middleware/error.middleware'

import * as cors from 'cors';


class App {
  public app: express.Application;

  private options: cors.CorsOptions = {
    allowedHeaders: ["Access-Control-Allow-Headers", "Authorization", "Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: `${process.env.APP_URL}`,
    preflightContinue: false
  };

  constructor(controllers: Controller[]) {
    this.app = express();

    this.connectToTheDatabase();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(process.env.PORT, () => {
      console.log(`App listening on the port ${process.env.PORT}`);
    });
  }

  private initializeMiddlewares() {
    this.app.use(bodyParser.json());
    this.app.use(cookieParser());
    this.app.use(cors(this.options));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeControllers(controllers: Controller[]) {
    controllers.forEach((controller) => {
      this.app.use('/', controller.router);
    });
  }

  private connectToTheDatabase() {
    const {
      DB_HOST,
      DB_PORT,
      DB_NAME,
      DB_USER,
      DB_PASSWORD
    } = process.env;

    // const mongo_location = 'mongodb://' + "127.0.0.1" + ':' + "27017" + '/' + "synergyDB";
    mongoose.connect('mongodb://' + DB_USER + ':' + DB_PASSWORD + '@' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }).catch((err) => {
      console.log('*** Can Not Connect to Mongo Server:', 'mongodb://' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME)
      console.log(err)
    })

    //mongoose.connect(`mongodb://${MONGO_USER}:${MONGO_PASSWORD}${MONGO_PATH}`);
    //mongoose.connect('mongodb://' + "localhost" + ':' + "27017" + '/' + "synergyDB", {
    // reconnectTries: Number.MAX_VALUE,
    // autoReconnect: true,
    // useNewUrlParser: true,
    // useUnifiedTopology: true
    //})
  }
}

export default App;
