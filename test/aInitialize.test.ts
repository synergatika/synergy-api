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
import transactionModel from '../src/models/transaction.model';
import { defaultAdmin, defaultMerchant_1, defaultMerchant_2, defaultMerchant_3 } from './_structs.test';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');

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
    return transactionModel.deleteMany({});
  });
  before(() => {
    return userModel.deleteMany({});
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
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: defaultMerchant_1.name,
          email: defaultMerchant_1.email
        })
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
        .send({
          name: defaultMerchant_1.name,
          imageURL: defaultMerchant_1.imageURL,
          contact: {
            phone: defaultMerchant_1.contact.phone,
            websiteURL: defaultMerchant_1.contact.websiteURL,
            address: {
              street: defaultMerchant_1.contact.address.street,
              zipCode: defaultMerchant_1.contact.address.zipCode,
              city: defaultMerchant_1.contact.address.city
            }
          },
          sector: defaultMerchant_1.sector,
        })
        .end((err, res) => {
          res.should.have.status(200);
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
        .send({
          name: defaultMerchant_2.name,
          email: defaultMerchant_2.email
        })
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
        .send({
          name: defaultMerchant_2.name,
          imageURL: defaultMerchant_2.imageURL,
          contact: {
            phone: defaultMerchant_2.contact.phone,
            websiteURL: defaultMerchant_2.contact.websiteURL,
            address: {
              street: defaultMerchant_2.contact.address.street,
              zipCode: defaultMerchant_2.contact.address.zipCode,
              city: defaultMerchant_2.contact.address.city
            }
          },
          sector: defaultMerchant_2.sector,
        })
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
        .send({
          name: defaultMerchant_3.name,
          email: defaultMerchant_3.email
        })
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
        .send({
          name: defaultMerchant_3.name,
          imageURL: defaultMerchant_3.imageURL,
          contact: {
            phone: defaultMerchant_3.contact.phone,
            websiteURL: defaultMerchant_3.contact.websiteURL,
            address: {
              street: defaultMerchant_3.contact.address.street,
              zipCode: defaultMerchant_3.contact.address.zipCode,
              city: defaultMerchant_3.contact.address.city
            }
          },
          sector: defaultMerchant_3.sector,
        })
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
        .send({
          description: 'One Year Free Hosting',
          cost: 2000,
          expiresAt: _newDate1.toString()
        })
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
        .send({
          description: 'Free Wordpress Website',
          cost: 5000,
          expiresAt: _newDate2.toString()
        })
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
        .send({
          description: 'Free land Analysis up to 500 square meters',
          cost: 10000,
          expiresAt: _newDate1.toString()
        })
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
        .send({
          description: 'Free land Analysis up to 1500 square meters',
          cost: 20000,
          expiresAt: _newDate2.toString()
        })
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
        .send({
          description: 'An Easter Wine Basket',
          cost: 500,
          expiresAt: _newDate1.toString()
        })
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
        .send({
          description: 'One kilo of apples',
          cost: 100,
          expiresAt: _newDate2.toString()
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Posts / Events - Default Merchant 1", () => {
    it("7.1 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          content: 'This is a Public Post by Sociality. Everyone can see it.',
          type: 'post',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("7.2 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          content: 'This is a Private Event by Sociality. Only registered users can see it.',
          type: 'event',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("7.3 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          content: 'This is another Public Post by Sociality. Everyone can see it.',
          type: 'post',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Posts / Events - Default Merchant 2", () => {
    it("8.1 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          content: 'This is a Public Event by Commonspace. Everyone can see it.',
          type: 'event',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("8.2 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          content: 'This is a Private Event by Commonspace. Only registered users can see it.',
          type: 'event',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("8.3 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          content: 'This is an Only For Partners Post by Commonspace. Only stores\' owners can see it.',
          type: 'post',
          access: 'partners'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Posts / Events - Default Merchant 3", () => {
    it("9.1 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          content: 'This is a Public Post by Synallois. Only registered users can see it.',
          type: 'post',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("9.2 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          content: 'This is a Private Event by Synallois. Only registered users can see it.',
          type: 'event',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
    it("9.3 should create a new post/event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          content: 'This is a Public Post by Synallois. Everyone can see it.',
          type: 'post',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();

        });
    });
  });
});
