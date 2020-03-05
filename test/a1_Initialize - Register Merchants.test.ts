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

import { imagesLocation, defaultAdmin, defaultMerchant_1, defaultMerchant_2, defaultMerchant_3, defaultMerchant_4, defaultMerchant_5, defaultMerchant_6 } from './_structs.test';
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
  describe("Registration - Default Merchant 1", () => {
    it("1.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_1.email)
        .field('name', defaultMerchant_1.name)
        .field('subtitle', defaultMerchant_1.subtitle)
        .field('description', defaultMerchant_1.description)
        .field('timetable', defaultMerchant_1.timetable)
        .field('phone', defaultMerchant_1.contact.phone)
        .field('websiteURL', defaultMerchant_1.contact.websiteURL)
        .field('street', defaultMerchant_1.address.street)
        .field('postCode', defaultMerchant_1.address.postCode)
        .field('city', defaultMerchant_1.address.city)
        .field('lat', defaultMerchant_1.address.coordinates[0])
        .field('long', defaultMerchant_1.address.coordinates[1])
        .field('sector', defaultMerchant_1.sector)
        .field('nationalBank', defaultMerchant_1.payments.nationalBank)
        .field('pireausBank', defaultMerchant_1.payments.pireausBank)
        .field('eurobank', defaultMerchant_1.payments.eurobank)
        .field('alphaBank', defaultMerchant_1.payments.alphaBank)
        .field('paypal', defaultMerchant_1.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_1.imageFile}`),
          `${defaultMerchant_1.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_1.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("1.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_1.email,
          password: defaultMerchant_1.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_1.email)
        .send({
          oldPassword: defaultMerchant_1.tempPass,
          newPassword: defaultMerchant_1.password
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
          email: defaultMerchant_1.email,
          password: defaultMerchant_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_1._id = res.body.data.user._id;
          defaultMerchant_1.authToken = res.body.data.token.token;
          done();
        });
    });
    it("1.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_1._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('name', defaultMerchant_1.name)
        .field('subtitle', defaultMerchant_1.subtitle)
        .field('description', defaultMerchant_1.description)
        .field('timetable', defaultMerchant_1.timetable)
        .field('phone', defaultMerchant_1.contact.phone)
        .field('websiteURL', defaultMerchant_1.contact.websiteURL)
        .field('street', defaultMerchant_1.address.street)
        .field('postCode', defaultMerchant_1.address.postCode)
        .field('city', defaultMerchant_1.address.city)
        .field('lat', defaultMerchant_1.address.coordinates[0])
        .field('long', defaultMerchant_1.address.coordinates[1])
        .field('sector', defaultMerchant_1.sector)
        .field('nationalBank', defaultMerchant_1.payments.nationalBank)
        .field('pireausBank', defaultMerchant_1.payments.pireausBank)
        .field('eurobank', defaultMerchant_1.payments.eurobank)
        .field('alphaBank', defaultMerchant_1.payments.alphaBank)
        .field('paypal', defaultMerchant_1.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_1.imageFile}`),
          `${defaultMerchant_1.imageFile}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Merchant 2", () => {
    it("2.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_2.email)
        .field('name', defaultMerchant_2.name)
        .field('subtitle', defaultMerchant_2.subtitle)
        .field('description', defaultMerchant_2.description)
        .field('timetable', defaultMerchant_2.timetable)
        .field('phone', defaultMerchant_2.contact.phone)
        .field('websiteURL', defaultMerchant_2.contact.websiteURL)
        .field('street', defaultMerchant_2.address.street)
        .field('postCode', defaultMerchant_2.address.postCode)
        .field('city', defaultMerchant_2.address.city)
        .field('lat', defaultMerchant_2.address.coordinates[0])
        .field('long', defaultMerchant_2.address.coordinates[1])
        .field('sector', defaultMerchant_2.sector)
        .field('nationalBank', defaultMerchant_2.payments.nationalBank)
        .field('pireausBank', defaultMerchant_2.payments.pireausBank)
        .field('eurobank', defaultMerchant_2.payments.eurobank)
        .field('alphaBank', defaultMerchant_2.payments.alphaBank)
        .field('paypal', defaultMerchant_2.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_2.imageFile}`),
          `${defaultMerchant_2.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_2.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("2.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_2.email,
          password: defaultMerchant_2.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_2.email)
        .send({
          oldPassword: defaultMerchant_2.tempPass,
          newPassword: defaultMerchant_2.password
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
          email: defaultMerchant_2.email,
          password: defaultMerchant_2.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_2._id = res.body.data.user._id;
          defaultMerchant_2.authToken = res.body.data.token.token;
          done();
        });
    });
    it("2.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_2._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('name', defaultMerchant_2.name)
        .field('subtitle', defaultMerchant_2.subtitle)
        .field('description', defaultMerchant_2.description)
        .field('timetable', defaultMerchant_2.timetable)
        .field('phone', defaultMerchant_2.contact.phone)
        .field('websiteURL', defaultMerchant_2.contact.websiteURL)
        .field('street', defaultMerchant_2.address.street)
        .field('postCode', defaultMerchant_2.address.postCode)
        .field('city', defaultMerchant_2.address.city)
        .field('lat', defaultMerchant_2.address.coordinates[0])
        .field('long', defaultMerchant_2.address.coordinates[1])
        .field('sector', defaultMerchant_2.sector)
        .field('nationalBank', defaultMerchant_2.payments.nationalBank)
        .field('pireausBank', defaultMerchant_2.payments.pireausBank)
        .field('eurobank', defaultMerchant_2.payments.eurobank)
        .field('alphaBank', defaultMerchant_2.payments.alphaBank)
        .field('paypal', defaultMerchant_2.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_2.imageFile}`),
          `${defaultMerchant_2.imageFile}`)
        // .send({
        //   name: defaultMerchant_2.name,
        //   imageURL: defaultMerchant_2.imageURL,
        //   contact: {
        //     phone: defaultMerchant_2.contact.phone,
        //     websiteURL: defaultMerchant_2.contact.websiteURL
        //   },
        //   address: {
        //     street: defaultMerchant_2.contact.address.street,
        //     postCode: defaultMerchant_2.contact.address.postCode,
        //     city: defaultMerchant_2.contact.address.city
        //   },
        //   sector: defaultMerchant_2.sector,
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
  describe("Registration - Default Merchant 3", () => {
    it("3.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_3.email)
        .field('name', defaultMerchant_3.name)
        .field('subtitle', defaultMerchant_3.subtitle)
        .field('description', defaultMerchant_3.description)
        .field('timetable', defaultMerchant_3.timetable)
        .field('phone', defaultMerchant_3.contact.phone)
        .field('websiteURL', defaultMerchant_3.contact.websiteURL)
        .field('street', defaultMerchant_3.address.street)
        .field('postCode', defaultMerchant_3.address.postCode)
        .field('city', defaultMerchant_3.address.city)
        .field('lat', defaultMerchant_3.address.coordinates[0])
        .field('long', defaultMerchant_3.address.coordinates[1])
        .field('sector', defaultMerchant_3.sector)
        .field('nationalBank', defaultMerchant_3.payments.nationalBank)
        .field('pireausBank', defaultMerchant_3.payments.pireausBank)
        .field('eurobank', defaultMerchant_3.payments.eurobank)
        .field('alphaBank', defaultMerchant_3.payments.alphaBank)
        .field('paypal', defaultMerchant_3.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_3.imageFile}`),
          `${defaultMerchant_3.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_3.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("3.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_3.email,
          password: defaultMerchant_3.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_3.email)
        .send({
          oldPassword: defaultMerchant_3.tempPass,
          newPassword: defaultMerchant_3.password
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
          email: defaultMerchant_3.email,
          password: defaultMerchant_3.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_3._id = res.body.data.user._id;
          defaultMerchant_3.authToken = res.body.data.token.token;
          done();
        });
    });
    it("3.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_3._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('name', defaultMerchant_3.name)
        .field('subtitle', defaultMerchant_3.subtitle)
        .field('description', defaultMerchant_3.description)
        .field('timetable', defaultMerchant_3.timetable)
        .field('phone', defaultMerchant_3.contact.phone)
        .field('websiteURL', defaultMerchant_3.contact.websiteURL)
        .field('street', defaultMerchant_3.address.street)
        .field('postCode', defaultMerchant_3.address.postCode)
        .field('city', defaultMerchant_3.address.city)
        .field('lat', defaultMerchant_3.address.coordinates[0])
        .field('long', defaultMerchant_3.address.coordinates[1])
        .field('sector', defaultMerchant_3.sector)
        .field('nationalBank', defaultMerchant_3.payments.nationalBank)
        .field('pireausBank', defaultMerchant_3.payments.pireausBank)
        .field('eurobank', defaultMerchant_3.payments.eurobank)
        .field('alphaBank', defaultMerchant_3.payments.alphaBank)
        .field('paypal', defaultMerchant_3.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_3.imageFile}`),
          `${defaultMerchant_3.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Merchant 4", () => {
    it("4.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_4.email)
        .field('name', defaultMerchant_4.name)
        .field('subtitle', defaultMerchant_4.subtitle)
        .field('description', defaultMerchant_4.description)
        .field('timetable', defaultMerchant_4.timetable)
        .field('phone', defaultMerchant_4.contact.phone)
        .field('websiteURL', defaultMerchant_4.contact.websiteURL)
        .field('street', defaultMerchant_4.address.street)
        .field('postCode', defaultMerchant_4.address.postCode)
        .field('city', defaultMerchant_4.address.city)
        .field('lat', defaultMerchant_4.address.coordinates[0])
        .field('long', defaultMerchant_4.address.coordinates[1])
        .field('sector', defaultMerchant_4.sector)
        .field('nationalBank', defaultMerchant_4.payments.nationalBank)
        .field('pireausBank', defaultMerchant_4.payments.pireausBank)
        .field('eurobank', defaultMerchant_4.payments.eurobank)
        .field('alphaBank', defaultMerchant_4.payments.alphaBank)
        .field('paypal', defaultMerchant_4.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_4.imageFile}`),
          `${defaultMerchant_4.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_4.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("4.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_4.email,
          password: defaultMerchant_4.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_4.email)
        .send({
          oldPassword: defaultMerchant_4.tempPass,
          newPassword: defaultMerchant_4.password
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
          email: defaultMerchant_4.email,
          password: defaultMerchant_4.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_4._id = res.body.data.user._id;
          defaultMerchant_4.authToken = res.body.data.token.token;
          done();
        });
    });
    it("4.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_4._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_4.authToken)
        .field('name', defaultMerchant_4.name)
        .field('subtitle', defaultMerchant_4.subtitle)
        .field('description', defaultMerchant_4.description)
        .field('timetable', defaultMerchant_4.timetable)
        .field('phone', defaultMerchant_4.contact.phone)
        .field('websiteURL', defaultMerchant_4.contact.websiteURL)
        .field('street', defaultMerchant_4.address.street)
        .field('postCode', defaultMerchant_4.address.postCode)
        .field('city', defaultMerchant_4.address.city)
        .field('lat', defaultMerchant_4.address.coordinates[0])
        .field('long', defaultMerchant_4.address.coordinates[1])
        .field('sector', defaultMerchant_4.sector)
        .field('nationalBank', defaultMerchant_4.payments.nationalBank)
        .field('pireausBank', defaultMerchant_4.payments.pireausBank)
        .field('eurobank', defaultMerchant_4.payments.eurobank)
        .field('alphaBank', defaultMerchant_4.payments.alphaBank)
        .field('paypal', defaultMerchant_4.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_4.imageFile}`),
          `${defaultMerchant_4.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Merchant 5", () => {
    it("5.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_5.email)
        .field('name', defaultMerchant_5.name)
        .field('subtitle', defaultMerchant_5.subtitle)
        .field('description', defaultMerchant_5.description)
        .field('timetable', defaultMerchant_5.timetable)
        .field('phone', defaultMerchant_5.contact.phone)
        .field('websiteURL', defaultMerchant_5.contact.websiteURL)
        .field('street', defaultMerchant_5.address.street)
        .field('postCode', defaultMerchant_5.address.postCode)
        .field('city', defaultMerchant_5.address.city)
        .field('lat', defaultMerchant_5.address.coordinates[0])
        .field('long', defaultMerchant_5.address.coordinates[1])
        .field('sector', defaultMerchant_5.sector)
        .field('nationalBank', defaultMerchant_5.payments.nationalBank)
        .field('pireausBank', defaultMerchant_5.payments.pireausBank)
        .field('eurobank', defaultMerchant_5.payments.eurobank)
        .field('alphaBank', defaultMerchant_5.payments.alphaBank)
        .field('paypal', defaultMerchant_5.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_5.imageFile}`),
          `${defaultMerchant_5.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_5.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("5.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_5.email,
          password: defaultMerchant_5.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_5.email)
        .send({
          oldPassword: defaultMerchant_5.tempPass,
          newPassword: defaultMerchant_5.password
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
          email: defaultMerchant_5.email,
          password: defaultMerchant_5.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_5._id = res.body.data.user._id;
          defaultMerchant_5.authToken = res.body.data.token.token;
          done();
        });
    });
    it("5.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_5._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_5.authToken)
        .field('name', defaultMerchant_5.name)
        .field('subtitle', defaultMerchant_5.subtitle)
        .field('description', defaultMerchant_5.description)
        .field('timetable', defaultMerchant_5.timetable)
        .field('phone', defaultMerchant_5.contact.phone)
        .field('websiteURL', defaultMerchant_5.contact.websiteURL)
        .field('street', defaultMerchant_5.address.street)
        .field('postCode', defaultMerchant_5.address.postCode)
        .field('city', defaultMerchant_5.address.city)
        .field('lat', defaultMerchant_5.address.coordinates[0])
        .field('long', defaultMerchant_5.address.coordinates[1])
        .field('sector', defaultMerchant_5.sector)
        .field('nationalBank', defaultMerchant_5.payments.nationalBank)
        .field('pireausBank', defaultMerchant_5.payments.pireausBank)
        .field('eurobank', defaultMerchant_5.payments.eurobank)
        .field('alphaBank', defaultMerchant_5.payments.alphaBank)
        .field('paypal', defaultMerchant_5.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_5.imageFile}`),
          `${defaultMerchant_5.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Registration - Default Merchant 6", () => {
    it("6.1 should create a new merchant - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', defaultMerchant_6.email)
        .field('name', defaultMerchant_6.name)
        .field('subtitle', defaultMerchant_6.subtitle)
        .field('description', defaultMerchant_6.description)
        .field('timetable', defaultMerchant_6.timetable)
        .field('phone', defaultMerchant_6.contact.phone)
        .field('websiteURL', defaultMerchant_6.contact.websiteURL)
        .field('street', defaultMerchant_6.address.street)
        .field('postCode', defaultMerchant_6.address.postCode)
        .field('city', defaultMerchant_6.address.city)
        .field('lat', defaultMerchant_6.address.coordinates[0])
        .field('long', defaultMerchant_6.address.coordinates[1])
        .field('sector', defaultMerchant_6.sector)
        .field('nationalBank', defaultMerchant_6.payments.nationalBank)
        .field('pireausBank', defaultMerchant_6.payments.pireausBank)
        .field('eurobank', defaultMerchant_6.payments.eurobank)
        .field('alphaBank', defaultMerchant_6.payments.alphaBank)
        .field('paypal', defaultMerchant_6.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_6.imageFile}`),
          `${defaultMerchant_6.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          defaultMerchant_6.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("6.2 sould NOT authenticate the new merchant | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: defaultMerchant_6.email,
          password: defaultMerchant_6.tempPass
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
        .put("auth/set_pass/" + defaultMerchant_6.email)
        .send({
          oldPassword: defaultMerchant_6.tempPass,
          newPassword: defaultMerchant_6.password
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
          email: defaultMerchant_6.email,
          password: defaultMerchant_6.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          defaultMerchant_6._id = res.body.data.user._id;
          defaultMerchant_6.authToken = res.body.data.token.token;
          done();
        });
    });
    it("6.5  should update merchant's profile(info) - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_6._id)
        .set('Authorization', 'Bearer ' + defaultMerchant_6.authToken)
        .field('name', defaultMerchant_6.name)
        .field('subtitle', defaultMerchant_6.subtitle)
        .field('description', defaultMerchant_6.description)
        .field('timetable', defaultMerchant_6.timetable)
        .field('phone', defaultMerchant_6.contact.phone)
        .field('websiteURL', defaultMerchant_6.contact.websiteURL)
        .field('street', defaultMerchant_6.address.street)
        .field('postCode', defaultMerchant_6.address.postCode)
        .field('city', defaultMerchant_6.address.city)
        .field('lat', defaultMerchant_6.address.coordinates[0])
        .field('long', defaultMerchant_6.address.coordinates[1])
        .field('sector', defaultMerchant_6.sector)
        .field('nationalBank', defaultMerchant_6.payments.nationalBank)
        .field('pireausBank', defaultMerchant_6.payments.pireausBank)
        .field('eurobank', defaultMerchant_6.payments.eurobank)
        .field('alphaBank', defaultMerchant_6.payments.alphaBank)
        .field('paypal', defaultMerchant_6.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}${defaultMerchant_6.imageFile}`),
          `${defaultMerchant_6.imageFile}`)
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
