import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');
var fs = require('fs')
var rimraf = require("rimraf");


import { defaultAdmin, content_a, sector_a } from './_structs.test';
import userModel from '../src/models/user.model';
import postModel from '../src/models/post.model';
import eventModel from '../src/models/event.model';
import offerModel from '../src/models/offer.model';
import microcreditModel from '../src/models/microcredit.model';
import registrationTransactionModel from '../src/models/registration.transaction.model';
import loyaltyTransactionModel from '../src/models/loyalty.transaction.model';
import microcreditTransactionModel from '../src/models/microcredit.transaction.model';
import contentModel from '../src/models/content.model';
import sectorModel from '../src/models/sector.model';

describe("Initialize DB & Drop past Collections", () => {

  it("0. should establish a new DB Connection", (done) => {
    chai.request(`${process.env.API_URL}`)
      .get("status")
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      })
  });
  before((done) => {
    connectToTheDatabase();
    function connectToTheDatabase() {
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
      })
        .then(() => {
          done();
        })
        .catch((err) => {
          console.log('*** Can Not Connect to Mongo Server:', 'mongodb://' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME)
          console.log(err)
        })
    }
  });
  before(() => {
    return postModel.deleteMany({});
  });
  before(() => {
    return eventModel.deleteMany({});
  });
  before(() => {
    return microcreditModel.deleteMany({});
  });
  before(() => {
    return offerModel.deleteMany({});
  });

  before(() => {
    return contentModel.deleteOne({ name: content_a.name });
  });
  before(() => {
    return sectorModel.deleteOne({ slug: sector_a.slug });
  });
  before(() => {
    return registrationTransactionModel.deleteMany({});
  });
  before(() => {
    return loyaltyTransactionModel.deleteMany({});
  });
  before(() => {
    return microcreditTransactionModel.deleteMany({});
  });
  before(() => {
    return userModel.deleteMany({});
  });
  before(() => {
    return rimraf.sync(path.join(__dirname, '../assets/static/'));
  });
  before(() => {
    return fs.mkdirSync(path.join(__dirname, '../assets/static/'));
  });
  // before(() => {
  //   return rimraf.sync(path.join(__dirname, '../assets/content/'));
  // });
  // before(() => {
  //   return fs.mkdirSync(path.join(__dirname, '../assets/content/'));
  // });
  before(() => {
    return userModel.create({
      email: defaultAdmin.email,
      access: defaultAdmin.access,
      password: bcrypt.hashSync(defaultAdmin.password, 10),
      email_verified: true,
      pass_verified: true
    });
  });
  after((done) => {
    mongoose.disconnect().then(() => { done(); });
  });
});
