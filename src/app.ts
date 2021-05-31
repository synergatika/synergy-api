import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as mongoose from 'mongoose';
import Controller from './interfaces/controller.interface';
import * as cookieParser from 'cookie-parser';
import errorMiddleware from './middleware/errors/error.middleware'
import Schedule from './utils/schedule';

var path = require('path');
import * as cors from 'cors';

const Sentry = require('@sentry/node');

class App {
  public app: express.Application;

  private options: cors.CorsOptions = {
    allowedHeaders: ["Access-Control-Allow-Origin", "Authorization", "Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: [`${process.env.APP_URL}`.slice(0, -1), 'https://open.synergatika.gr', 'http://localhost:4200', 'http://localhost:4300'],
    preflightContinue: false
  };

  constructor(controllers: Controller[]) {
    Sentry.init({ dsn: process.env.SENTRY_URI });
    this.app = express();

    this.connectToTheDatabase();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
    this.startSchedule();
  }

  public listen() {
    this.app.listen(process.env.PORT, () => {
      console.log(`App listening on the port ${process.env.PORT}`);
    });
  }

  public startSchedule() {
    Schedule.campaingStarts();
  }

  private initializeMiddlewares() {
    this.app.use(bodyParser.json());
    this.app.use('/assets', express.static(path.join(__dirname, '../assets')));
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

    mongoose.connect('mongodb://' + DB_USER + ':' + DB_PASSWORD + '@' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME + "?authSource=admin", {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }).catch((err) => {
      console.log('*** Can Not Connect to Mongo Server:', 'mongodb://' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME)
    })
  }
}

export default App;
