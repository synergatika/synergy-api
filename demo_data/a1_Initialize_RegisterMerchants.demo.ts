import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import userModel from '../src/models/user.model';
import registrationTransactionModel from '../src/models/registration.transaction.model';
import loyaltyTransactionModel from '../src/models/loyalty.transaction.model';
import microcreditTransactionModel from '../src/models/microcredit.transaction.model';

import { imagesLocation, defaultAdmin, defaultPartner_1, defaultPartner_2, defaultPartner_3, defaultPartner_4, defaultPartner_5, defaultPartner_6 } from './_structs.demo';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');
// Image Upload & Remove
const fs = require('fs')
// const { promisify } = require('util')
// const unlinkAsync = promisify(fs.unlink);
var rimraf = require("rimraf");
// Eth
import { BlockchainService } from '../src/utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

describe("Check API's Status", () => {
  it("1. should establish a new DB Connection", (done) => {
    chai.request(`${process.env.API_URL}`)
      .get("status")
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      })
  });
});

describe("Initialize DB & Drop past Collections", () => {
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

      // const mongo_location = 'mongodb://' + "127.0.0.1" + ':' + "27017" + '/' + "synergyDB";
      mongoose.connect('mongodb://' + DB_USER + ':' + DB_PASSWORD + '@' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME, {
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
    return rimraf.sync(path.join(__dirname, '../assets/profile/'));
  });
  before(() => {
    return fs.mkdirSync(path.join(__dirname, '../assets/profile/'));
  });
  before(() => {
    return rimraf.sync(path.join(__dirname, '../assets/items/'));
  });
  before(() => {
    return fs.mkdirSync(path.join(__dirname, '../assets/items/'));
  });
  before(() => {
    return userModel.create({
      email: defaultAdmin.email,
      access: 'admin',
      password: bcrypt.hashSync(defaultAdmin.password, 10),
      email_verified: true,
      pass_verified: true
    });
  });
  after((done) => {
    mongoose.disconnect().then(() => { done(); });
  });

  describe("Admin Authenticate (/auth)", () => {
    it("0.1 should authenticate user as Admin - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultAdmin.email,
          password: defaultAdmin.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultAdmin._id = res.body.data.user._id;
          defaultAdmin.authToken = res.body.data.token.token;
          done();
        });
    });
  });
  describe("Registration - Default Partner 1", () => {
    it("1.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_1.email)
        .field('name', defaultPartner_1.name)
        .field('subtitle', defaultPartner_1.subtitle)
        .field('description', defaultPartner_1.description)
        .field('timetable', defaultPartner_1.timetable)
        .field('phone', defaultPartner_1.contact.phone)
        .field('websiteURL', defaultPartner_1.contact.websiteURL)
        .field('street', defaultPartner_1.address.street)
        .field('postCode', defaultPartner_1.address.postCode)
        .field('city', defaultPartner_1.address.city)
        .field('lat', defaultPartner_1.address.coordinates[0])
        .field('long', defaultPartner_1.address.coordinates[1])
        .field('sector', defaultPartner_1.sector)
        .field('nationalBank', defaultPartner_1.payments.nationalBank)
        .field('pireausBank', defaultPartner_1.payments.pireausBank)
        .field('eurobank', defaultPartner_1.payments.eurobank)
        .field('alphaBank', defaultPartner_1.payments.alphaBank)
        .field('paypal', defaultPartner_1.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_1.imageFile}`),
          `${defaultPartner_1.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_1.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("1.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_1.email,
          password: defaultPartner_1.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("1.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_1.email)
        .send({
          oldPassword: defaultPartner_1.tempPass,
          newPassword: defaultPartner_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("1.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_1.email,
          password: defaultPartner_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_1._id = res.body.data.user._id;
          defaultPartner_1.authToken = res.body.data.token.token;
          done();
        });
    });
    it("1.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_1._id)
        .set('Authorization', 'Bearer ' + defaultPartner_1.authToken)
        .field('name', defaultPartner_1.name)
        .field('subtitle', defaultPartner_1.subtitle)
        .field('description', defaultPartner_1.description)
        .field('timetable', defaultPartner_1.timetable)
        .field('phone', defaultPartner_1.contact.phone)
        .field('websiteURL', defaultPartner_1.contact.websiteURL)
        .field('street', defaultPartner_1.address.street)
        .field('postCode', defaultPartner_1.address.postCode)
        .field('city', defaultPartner_1.address.city)
        .field('lat', defaultPartner_1.address.coordinates[0])
        .field('long', defaultPartner_1.address.coordinates[1])
        .field('sector', defaultPartner_1.sector)
        .field('nationalBank', defaultPartner_1.payments.nationalBank)
        .field('pireausBank', defaultPartner_1.payments.pireausBank)
        .field('eurobank', defaultPartner_1.payments.eurobank)
        .field('alphaBank', defaultPartner_1.payments.alphaBank)
        .field('paypal', defaultPartner_1.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_1.imageFile}`),
          `${defaultPartner_1.imageFile}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Partner 2", () => {
    it("2.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_2.email)
        .field('name', defaultPartner_2.name)
        .field('subtitle', defaultPartner_2.subtitle)
        .field('description', defaultPartner_2.description)
        .field('timetable', defaultPartner_2.timetable)
        .field('phone', defaultPartner_2.contact.phone)
        .field('websiteURL', defaultPartner_2.contact.websiteURL)
        .field('street', defaultPartner_2.address.street)
        .field('postCode', defaultPartner_2.address.postCode)
        .field('city', defaultPartner_2.address.city)
        .field('lat', defaultPartner_2.address.coordinates[0])
        .field('long', defaultPartner_2.address.coordinates[1])
        .field('sector', defaultPartner_2.sector)
        .field('nationalBank', defaultPartner_2.payments.nationalBank)
        .field('pireausBank', defaultPartner_2.payments.pireausBank)
        .field('eurobank', defaultPartner_2.payments.eurobank)
        .field('alphaBank', defaultPartner_2.payments.alphaBank)
        .field('paypal', defaultPartner_2.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_2.imageFile}`),
          `${defaultPartner_2.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_2.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("2.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_2.email,
          password: defaultPartner_2.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("2.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_2.email)
        .send({
          oldPassword: defaultPartner_2.tempPass,
          newPassword: defaultPartner_2.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_2.email,
          password: defaultPartner_2.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_2._id = res.body.data.user._id;
          defaultPartner_2.authToken = res.body.data.token.token;
          done();
        });
    });
    it("2.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_2._id)
        .set('Authorization', 'Bearer ' + defaultPartner_2.authToken)
        .field('name', defaultPartner_2.name)
        .field('subtitle', defaultPartner_2.subtitle)
        .field('description', defaultPartner_2.description)
        .field('timetable', defaultPartner_2.timetable)
        .field('phone', defaultPartner_2.contact.phone)
        .field('websiteURL', defaultPartner_2.contact.websiteURL)
        .field('street', defaultPartner_2.address.street)
        .field('postCode', defaultPartner_2.address.postCode)
        .field('city', defaultPartner_2.address.city)
        .field('lat', defaultPartner_2.address.coordinates[0])
        .field('long', defaultPartner_2.address.coordinates[1])
        .field('sector', defaultPartner_2.sector)
        .field('nationalBank', defaultPartner_2.payments.nationalBank)
        .field('pireausBank', defaultPartner_2.payments.pireausBank)
        .field('eurobank', defaultPartner_2.payments.eurobank)
        .field('alphaBank', defaultPartner_2.payments.alphaBank)
        .field('paypal', defaultPartner_2.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_2.imageFile}`),
          `${defaultPartner_2.imageFile}`)
        // .send({
        //   name: defaultPartner_2.name,
        //   imageURL: defaultPartner_2.imageURL,
        //   contact: {
        //     phone: defaultPartner_2.contact.phone,
        //     websiteURL: defaultPartner_2.contact.websiteURL
        //   },
        //   address: {
        //     street: defaultPartner_2.contact.address.street,
        //     postCode: defaultPartner_2.contact.address.postCode,
        //     city: defaultPartner_2.contact.address.city
        //   },
        //   sector: defaultPartner_2.sector,
        // })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Partner 3", () => {
    it("3.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_3.email)
        .field('name', defaultPartner_3.name)
        .field('subtitle', defaultPartner_3.subtitle)
        .field('description', defaultPartner_3.description)
        .field('timetable', defaultPartner_3.timetable)
        .field('phone', defaultPartner_3.contact.phone)
        .field('websiteURL', defaultPartner_3.contact.websiteURL)
        .field('street', defaultPartner_3.address.street)
        .field('postCode', defaultPartner_3.address.postCode)
        .field('city', defaultPartner_3.address.city)
        .field('lat', defaultPartner_3.address.coordinates[0])
        .field('long', defaultPartner_3.address.coordinates[1])
        .field('sector', defaultPartner_3.sector)
        .field('nationalBank', defaultPartner_3.payments.nationalBank)
        .field('pireausBank', defaultPartner_3.payments.pireausBank)
        .field('eurobank', defaultPartner_3.payments.eurobank)
        .field('alphaBank', defaultPartner_3.payments.alphaBank)
        .field('paypal', defaultPartner_3.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_3.imageFile}`),
          `${defaultPartner_3.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_3.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("3.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_3.email,
          password: defaultPartner_3.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("3.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_3.email)
        .send({
          oldPassword: defaultPartner_3.tempPass,
          newPassword: defaultPartner_3.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_3.email,
          password: defaultPartner_3.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_3._id = res.body.data.user._id;
          defaultPartner_3.authToken = res.body.data.token.token;
          done();
        });
    });
    it("3.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_3._id)
        .set('Authorization', 'Bearer ' + defaultPartner_3.authToken)
        .field('name', defaultPartner_3.name)
        .field('subtitle', defaultPartner_3.subtitle)
        .field('description', defaultPartner_3.description)
        .field('timetable', defaultPartner_3.timetable)
        .field('phone', defaultPartner_3.contact.phone)
        .field('websiteURL', defaultPartner_3.contact.websiteURL)
        .field('street', defaultPartner_3.address.street)
        .field('postCode', defaultPartner_3.address.postCode)
        .field('city', defaultPartner_3.address.city)
        .field('lat', defaultPartner_3.address.coordinates[0])
        .field('long', defaultPartner_3.address.coordinates[1])
        .field('sector', defaultPartner_3.sector)
        .field('nationalBank', defaultPartner_3.payments.nationalBank)
        .field('pireausBank', defaultPartner_3.payments.pireausBank)
        .field('eurobank', defaultPartner_3.payments.eurobank)
        .field('alphaBank', defaultPartner_3.payments.alphaBank)
        .field('paypal', defaultPartner_3.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_3.imageFile}`),
          `${defaultPartner_3.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Partner 4", () => {
    it("4.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_4.email)
        .field('name', defaultPartner_4.name)
        .field('subtitle', defaultPartner_4.subtitle)
        .field('description', defaultPartner_4.description)
        .field('timetable', defaultPartner_4.timetable)
        .field('phone', defaultPartner_4.contact.phone)
        .field('websiteURL', defaultPartner_4.contact.websiteURL)
        .field('street', defaultPartner_4.address.street)
        .field('postCode', defaultPartner_4.address.postCode)
        .field('city', defaultPartner_4.address.city)
        .field('lat', defaultPartner_4.address.coordinates[0])
        .field('long', defaultPartner_4.address.coordinates[1])
        .field('sector', defaultPartner_4.sector)
        .field('nationalBank', defaultPartner_4.payments.nationalBank)
        .field('pireausBank', defaultPartner_4.payments.pireausBank)
        .field('eurobank', defaultPartner_4.payments.eurobank)
        .field('alphaBank', defaultPartner_4.payments.alphaBank)
        .field('paypal', defaultPartner_4.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_4.imageFile}`),
          `${defaultPartner_4.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_4.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("4.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_4.email,
          password: defaultPartner_4.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("4.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_4.email)
        .send({
          oldPassword: defaultPartner_4.tempPass,
          newPassword: defaultPartner_4.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_4.email,
          password: defaultPartner_4.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_4._id = res.body.data.user._id;
          defaultPartner_4.authToken = res.body.data.token.token;
          done();
        });
    });
    it("4.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_4._id)
        .set('Authorization', 'Bearer ' + defaultPartner_4.authToken)
        .field('name', defaultPartner_4.name)
        .field('subtitle', defaultPartner_4.subtitle)
        .field('description', defaultPartner_4.description)
        .field('timetable', defaultPartner_4.timetable)
        .field('phone', defaultPartner_4.contact.phone)
        .field('websiteURL', defaultPartner_4.contact.websiteURL)
        .field('street', defaultPartner_4.address.street)
        .field('postCode', defaultPartner_4.address.postCode)
        .field('city', defaultPartner_4.address.city)
        .field('lat', defaultPartner_4.address.coordinates[0])
        .field('long', defaultPartner_4.address.coordinates[1])
        .field('sector', defaultPartner_4.sector)
        .field('nationalBank', defaultPartner_4.payments.nationalBank)
        .field('pireausBank', defaultPartner_4.payments.pireausBank)
        .field('eurobank', defaultPartner_4.payments.eurobank)
        .field('alphaBank', defaultPartner_4.payments.alphaBank)
        .field('paypal', defaultPartner_4.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_4.imageFile}`),
          `${defaultPartner_4.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Partner 5", () => {
    it("5.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_5.email)
        .field('name', defaultPartner_5.name)
        .field('subtitle', defaultPartner_5.subtitle)
        .field('description', defaultPartner_5.description)
        .field('timetable', defaultPartner_5.timetable)
        .field('phone', defaultPartner_5.contact.phone)
        .field('websiteURL', defaultPartner_5.contact.websiteURL)
        .field('street', defaultPartner_5.address.street)
        .field('postCode', defaultPartner_5.address.postCode)
        .field('city', defaultPartner_5.address.city)
        .field('lat', defaultPartner_5.address.coordinates[0])
        .field('long', defaultPartner_5.address.coordinates[1])
        .field('sector', defaultPartner_5.sector)
        .field('nationalBank', defaultPartner_5.payments.nationalBank)
        .field('pireausBank', defaultPartner_5.payments.pireausBank)
        .field('eurobank', defaultPartner_5.payments.eurobank)
        .field('alphaBank', defaultPartner_5.payments.alphaBank)
        .field('paypal', defaultPartner_5.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_5.imageFile}`),
          `${defaultPartner_5.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_5.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("5.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_5.email,
          password: defaultPartner_5.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("5.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_5.email)
        .send({
          oldPassword: defaultPartner_5.tempPass,
          newPassword: defaultPartner_5.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_5.email,
          password: defaultPartner_5.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_5._id = res.body.data.user._id;
          defaultPartner_5.authToken = res.body.data.token.token;
          done();
        });
    });
    it("5.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_5._id)
        .set('Authorization', 'Bearer ' + defaultPartner_5.authToken)
        .field('name', defaultPartner_5.name)
        .field('subtitle', defaultPartner_5.subtitle)
        .field('description', defaultPartner_5.description)
        .field('timetable', defaultPartner_5.timetable)
        .field('phone', defaultPartner_5.contact.phone)
        .field('websiteURL', defaultPartner_5.contact.websiteURL)
        .field('street', defaultPartner_5.address.street)
        .field('postCode', defaultPartner_5.address.postCode)
        .field('city', defaultPartner_5.address.city)
        .field('lat', defaultPartner_5.address.coordinates[0])
        .field('long', defaultPartner_5.address.coordinates[1])
        .field('sector', defaultPartner_5.sector)
        .field('nationalBank', defaultPartner_5.payments.nationalBank)
        .field('pireausBank', defaultPartner_5.payments.pireausBank)
        .field('eurobank', defaultPartner_5.payments.eurobank)
        .field('alphaBank', defaultPartner_5.payments.alphaBank)
        .field('paypal', defaultPartner_5.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_5.imageFile}`),
          `${defaultPartner_5.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Partner 6", () => {
    it("6.1 should create a new partner - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultPartner_6.email)
        .field('name', defaultPartner_6.name)
        .field('subtitle', defaultPartner_6.subtitle)
        .field('description', defaultPartner_6.description)
        .field('timetable', defaultPartner_6.timetable)
        .field('phone', defaultPartner_6.contact.phone)
        .field('websiteURL', defaultPartner_6.contact.websiteURL)
        .field('street', defaultPartner_6.address.street)
        .field('postCode', defaultPartner_6.address.postCode)
        .field('city', defaultPartner_6.address.city)
        .field('lat', defaultPartner_6.address.coordinates[0])
        .field('long', defaultPartner_6.address.coordinates[1])
        .field('sector', defaultPartner_6.sector)
        .field('nationalBank', defaultPartner_6.payments.nationalBank)
        .field('pireausBank', defaultPartner_6.payments.pireausBank)
        .field('eurobank', defaultPartner_6.payments.eurobank)
        .field('alphaBank', defaultPartner_6.payments.alphaBank)
        .field('paypal', defaultPartner_6.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_6.imageFile}`),
          `${defaultPartner_6.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultPartner_6.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("6.2 sould NOT authenticate the new partner | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultPartner_6.email,
          password: defaultPartner_6.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("6.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + defaultPartner_6.email)
        .send({
          oldPassword: defaultPartner_6.tempPass,
          newPassword: defaultPartner_6.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("6.4 should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: defaultPartner_6.email,
          password: defaultPartner_6.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultPartner_6._id = res.body.data.user._id;
          defaultPartner_6.authToken = res.body.data.token.token;
          done();
        });
    });
    it("6.5  should update partner's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + defaultPartner_6._id)
        .set('Authorization', 'Bearer ' + defaultPartner_6.authToken)
        .field('name', defaultPartner_6.name)
        .field('subtitle', defaultPartner_6.subtitle)
        .field('description', defaultPartner_6.description)
        .field('timetable', defaultPartner_6.timetable)
        .field('phone', defaultPartner_6.contact.phone)
        .field('websiteURL', defaultPartner_6.contact.websiteURL)
        .field('street', defaultPartner_6.address.street)
        .field('postCode', defaultPartner_6.address.postCode)
        .field('city', defaultPartner_6.address.city)
        .field('lat', defaultPartner_6.address.coordinates[0])
        .field('long', defaultPartner_6.address.coordinates[1])
        .field('sector', defaultPartner_6.sector)
        .field('nationalBank', defaultPartner_6.payments.nationalBank)
        .field('pireausBank', defaultPartner_6.payments.pireausBank)
        .field('eurobank', defaultPartner_6.payments.eurobank)
        .field('alphaBank', defaultPartner_6.payments.alphaBank)
        .field('paypal', defaultPartner_6.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultPartner_6.imageFile}`),
          `${defaultPartner_6.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
});
