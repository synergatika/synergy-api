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
import { imagesLocation, defaultAdmin, defaultMerchant_1, defaultMerchant_2, defaultMerchant_3 } from './_structs.test';
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
        // .send({
        //   name: defaultMerchant_1.name,
        //   imageURL: defaultMerchant_1.imageURL,
        //   contact: {
        //     phone: defaultMerchant_1.contact.phone,
        //     websiteURL: defaultMerchant_1.contact.websiteURL
        //   },
        //   address: {
        //     street: defaultMerchant_1.address.street,
        //     postCode: defaultMerchant_1.address.postCode,
        //     city: defaultMerchant_1.address.city
        //   }
        //   sector: defaultMerchant_1.sector,
        // })
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
        // .send({
        //   name: defaultMerchant_3.name,
        //   imageURL: defaultMerchant_3.imageURL,
        //   contact: {
        //     phone: defaultMerchant_3.contact.phone,
        //     websiteURL: defaultMerchant_3.contact.websiteURL
        //   },
        //   address: {
        //     street: defaultMerchant_3.contact.address.street,
        //     postCode: defaultMerchant_3.contact.address.postCode,
        //     city: defaultMerchant_3.contact.address.city
        //   },
        //   sector: defaultMerchant_3.sector,
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

  describe("Offers - Default Merchant 1", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 7);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setMonth(_date_2.getMonth() + 1);

    it("4.1 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'Hostess')
        .field('description', 'One Year Free Hosting')
        .field('cost', 2000)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_a.jfif`),
          `offer_a.jfif`)
        // .send({
        //   description: 'One Year Free Hosting',
        //   cost: 2000,
        //   expiresAt: _newDate1.toString()
        // })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("4.2 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'WP Free')
        .field('description', 'Free Wordpress Website')
        .field('cost', 5000)
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_b.jfif`),
          `offer_b.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Offers - Default Merchant 2", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setMonth(_date_1.getMonth() + 3);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setMonth(_date_2.getMonth() + 6);
    it("5.1 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'Land Free')
        .field('description', 'Free land Analysis up to 500 square meters')
        .field('cost', 10000)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_c.jfif`),
          `offer_c.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("5.2 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'More Land')
        .field('description', 'Free land Analysis up to 1500 square meters')
        .field('cost', 20000)
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_d.jfif`),
          `offer_d.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Offers - Default Merchant 3", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setMonth(_date_1.getMonth() + 1);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setMonth(_date_2.getMonth() + 3);
    it("6.1 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'Basket Time')
        .field('description', 'An Easter Wine Basket')
        .field('cost', 500)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_b.jfif`),
          `offer_b.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("6.2 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'Apples')
        .field('description', 'One kilo of appless')
        .field('cost', 100)
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}offer_d.jfif`),
          `offer_d.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });

  describe("Posts - Default Merchant 1", () => {
    it("7.1 should create a new post", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'My First')
        .field('content', 'This is a Public Post by Sociality. Everyone can see it.')
        .field('access', 'public')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}post_a.jfif`),
          `post_a.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("7.2 should create a new post", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'Private!!!')
        .field('content', 'This is a partners post by Sociality. Only registered users can see it.')
        .field('access', 'public')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}post_b.jfif`),
          `post_b.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Posts - Default Merchant 2", () => {
    it("8.1 should create a new post", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'One Post!')
        .field('content', 'This is a Public Post by Commonspace. Everyone can see it.')
        .field('access', 'partners')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}post_a.jfif`),
          `post_a.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("8.2 should create a new post", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'Sec Post!')
        .field('content', 'This is a private Post by Commonspace. Everyone can see it.')
        .field('access', 'private')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}post_b.jfif`),
          `post_b.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Posts - Default Merchant 3", () => {
    it("9.1 should create a new post", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'One Post!')
        .field('content', 'This is a partners Post by Synallois. Only registered users can see it.')
        .field('access', 'public')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}post_a.jfif`),
          `post_a.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Events - Default Merchant 1", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 4);

    it("10.1 should create a new event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'One Post!')
        .field('description', 'This is a Public Event by Commonspace. Everyone can see it.')
        .field('access', 'public')
        .field('location', 'Salonika')
        .field('dateTime', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}event_c.jfif`),
          `event_c.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("10.2 should create a new event", (done) => {
      var _date_1 = new Date();
      var _newDate1 = _date_1.setDate(_date_1.getDate() + 4);

      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'Sec Event!')
        .field('description', 'This is a private Event by Soc. Everyone can see it.')
        .field('access', 'public')
        .field('location', 'Athens')
        .field('dateTime', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}event_a.jfif`),
          `event_a.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Events - Default Merchant 2", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 1);

    it("11.1 should create a new event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'Sec Post!')
        .field('description', 'This is a private Event by Commonspace. Everyone can see it.')
        .field('access', 'private')
        .field('location', 'Athens')
        .field('dateTime', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}event_b.jfif`),
          `event_b.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });

  describe("Microcredit Campaigns - Default Merchant 1", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 1);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 300);
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 200);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 400);

    it("12.1 should create a new microcredit campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .field('title', 'Big Campaign!')
        .field('terms', 'Terms about it')
        .field('access', 'public')
        .field('description', 'Description: What exactly this campaign is about')
        .field('category', 'Technology')
        .field('quantitative', 'true')
        .field('minAllowed', '10')
        .field('maxAllowed', '20')
        .field('maxAmount', '1000')
        .field('redeemStarts', _newDate1.toString())
        .field('redeemEnds', _newDate2.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate3.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}microcredit_a.png`),
          `microcredit_a.png`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Microcredit Campaigns - Default Merchant 2", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 7);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 20);
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 200);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 400);

    it("13.1 should create a new microcredit campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .field('title', 'Yeah! Campaign!')
        .field('terms', 'Terms about it')
        .field('access', 'public')
        .field('description', 'Description: What exactly this campaign is about')
        .field('category', 'Technology')
        .field('quantitative', 'false')
        .field('minAllowed', '0')
        .field('maxAllowed', '0')
        .field('maxAmount', '1000')
        .field('redeemStarts', _newDate2.toString())
        .field('redeemEnds', _newDate3.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}microcredit_b.png`),
          `microcredit_b.png`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Microcredit Campaigns - Default Merchant 3", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 100);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 150);
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 200);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 400);

    it("14.1 should create a new microcredit campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'Big New Campaign!')
        .field('terms', 'Terms about it')
        .field('access', 'public')
        .field('description', 'Description: What exactly this campaign is about')
        .field('category', 'Durables')
        .field('quantitative', 'true')
        .field('minAllowed', '5')
        .field('maxAllowed', '20')
        .field('maxAmount', '5000')
        .field('redeemStarts', _newDate2.toString())
        .field('redeemEnds', _newDate3.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}microcredit_c.jpg`),
          `microcredit_c.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
});
