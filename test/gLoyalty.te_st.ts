import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant_1, defaultMerchant_2, defaultMerchant_3, newCustomer_1, newUser } from './_structs.test';

describe("Loyalty (/loyalty)", () => {
  describe("Points - From DefaultMerchant_1 to NewCustomer_1", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          password: defaultMerchant_1.password,
          _to: newCustomer_1.email,
          _amount: 2200
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_3 to NewCustomer_1", () => {
    it("1. should read customer's balance - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/balance/" + newCustomer_1.email)
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('points');
          done();
        });
    });
    it("2. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          password: defaultMerchant_3.password,
          _to: newCustomer_1.email,
          _amount: 35
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("3. should use points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/redeem")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          password: defaultMerchant_3.password,
          _to: newCustomer_1.email,
          _points: 700
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Recover Account - New Customer", () => {
    it("1. should send a restoration email - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("auth/forgot_pass/" + newCustomer_1.email)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          res.body.should.have.property('tempData')
          newCustomer_1.restorationToken = res.body.tempData.token;
          done();
        });
    });
    it("2. should validate restoration token - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/forgot_pass")
        .send({
          token: newCustomer_1.restorationToken
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should update/restore password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/forgot_pass")
        .send({
          token: newCustomer_1.restorationToken,
          newPassword: newCustomer_1.password,
          verPassword: newCustomer_1.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
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
    it("5. should read balance - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/balance")
        .set('Authorization', 'Bearer ' + newCustomer_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('points');
          done();
        });
    });
    it("6. should read transactions - 200 Transactions", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/transactions" + "/0-0-0")
        .set('Authorization', 'Bearer ' + newCustomer_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('array');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_1 to NewUser", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          password: defaultMerchant_1.password,
          _to: newUser.email,
          _amount: 250
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("2. should read balance - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/balance")
        .set('Authorization', 'Bearer ' + newUser.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('points');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_2 to NewUser", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          password: defaultMerchant_2.password,
          _to: newUser.email,
          _amount: 1250
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("2. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          password: defaultMerchant_2.password,
          _to: newUser.email,
          _amount: 420
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_1 to NewUser", () => {
    it("1. should read customer's balance - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/balance/" + newUser.email)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('points');
          done();
        });
    });
    it("2. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          password: defaultMerchant_1.password,
          _to: newUser.email,
          _amount: 50
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("3. should use points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/redeem")
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          password: defaultMerchant_1.password,
          _to: newUser.email,
          _points: 1000
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_3 to NewUser", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          password: defaultMerchant_3.password,
          _to: newUser.email,
          _amount: 200
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_2 to NewUser", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          password: defaultMerchant_2.password,
          _to: newUser.email,
          _amount: 60
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Points - From DefaultMerchant_2 to NewUser", () => {
    it("1. should earn points - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn")
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          password: defaultMerchant_2.password,
          _to: newUser.email,
          _amount: 96
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
});
