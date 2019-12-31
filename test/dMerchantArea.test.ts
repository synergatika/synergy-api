import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';

validateEnv();

import { defaultMerchant_1, defaultMerchant_2, newCustomer_1, newCustomer_2, newMerchant } from './_structs.test';

describe("Merchant", () => {

  describe("Merchant Authenticate (/auth)", () => {
    it("0.1 should authenticate user (merchant) - 200 Authenticate", (done) => {
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
  });
  describe("Registration - New Customer 1", () => {
    it("1.1 should NOT create a new merchant | merchant cannot create merchant - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "merchant")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          name: newMerchant.name,
          email: newMerchant.email
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("1.2 should create a new customer - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "customer")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          name: newCustomer_1.name,
          email: newCustomer_1.email
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          newCustomer_1.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("1.3 should NOT authenticate the new customer | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: newCustomer_1.email,
          password: newCustomer_1.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("1.4 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + newCustomer_1.email)
        .send({
          oldPassword: newCustomer_1.tempPass,
          newPassword: newCustomer_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("1.5 should authenticate the new user (customer) - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: newCustomer_1.email,
          password: newCustomer_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          newCustomer_1.authToken = res.body.data.token.token;
          done();
        });
    });
  });

  describe("Registration - New Customer 2", () => {
    it("2.1 should create a new customer - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/" + "customer")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          name: newCustomer_2.name,
          email: newCustomer_2.email
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          newCustomer_2.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("2.2 should NOT authenticate the new customer | password not verified - 204 Need Verification", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: newCustomer_2.email,
          password: newCustomer_2.tempPass
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.message.should.be.equal('need_password_verification');
          done();
        });
    });
    it("2.3 should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + newCustomer_2.email)
        .send({
          oldPassword: newCustomer_2.tempPass,
          newPassword: newCustomer_2.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2.4 should authenticate the new user (customer) - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: newCustomer_2.email,
          password: newCustomer_2.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          newCustomer_2.authToken = res.body.data.token.token;
          done();
        });
    });
  });

  describe("Profile (/merchants)", () => {
    it("1. should NOT update merchant's profile(info) | not belong to user - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + 'random_id')
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          name: "Merchant One",
          imageURL: "http://merchant_image.gr",
          contact: {
            phone: 2105555555,
            websiteURL: 'merchant_shop.gr',
            address: {
              street: "My Street",
              zipCode: 10000,
              city: "Athens"
            }
          },
          sector: "Durables"
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should NOT update merchant's profile(info) | wrong jwt - 401 Unauthorized", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("merchants/" + defaultMerchant_1._id)
        .set('Authorization', 'Bearer ' + 'random_jwt')
        .send({
          name: "Merchant One",
          imageURL: "http://merchant_image.gr",
          contact: {
            phone: 2105555555,
            websiteURL: 'merchant_shop.gr',
            address: {
              street: "My Street",
              zipCode: 10000,
              city: "Athens"
            }
          },
          sector: "Durables"
        })
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should update merchant's profile(info) - 200 Updated", (done) => {
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

  describe("Offers (/loyalty/offers)", () => {
    it("1. should NOT create a new offer | user is not merchant - 403 Forbidden", (done) => {
      var _date = new Date();
      var _newDate = _date.setDate(_date.getDate() + 7);

      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + newCustomer_1.authToken)
        .send({
          description: 'Free One Year Support',
          cost: 4000,
          expiresAt: _newDate.toString()
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();

        });
    });
    it("2. should NOT create a new offer | description is missing - 400 Bad Request", (done) => {
      var _date = new Date();
      var _newDate = _date.setDate(_date.getDate() + 7);

      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          cost: 2000,
          expiresAt: _newDate.toString()
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          done();

        });
    });
  });
  describe("Post & Events (/community)", () => {
    it("1. should NOT create a new offer | user is not merchant - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + newCustomer_2.authToken)
        .send({
          content: 'Random content',
          type: 'event',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();

        });
    });
    it("2. should NOT create a new event | content is missing - 400 Bad Request", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          type: 'event',
          access: 'public'
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          done();

        });
    });
  });
});
