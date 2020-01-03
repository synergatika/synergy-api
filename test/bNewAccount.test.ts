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
import { newUser } from './_structs.test';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');

// Eth
import { BlockchainService } from '../src/utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

describe("User Auto-Registration Path", () => {
  it("1. should NOT create a new user(customer) | as password is missing - 400 Bad Request", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/register")
      .send({
        email: newUser.email
      })
      .end((err, res) => {
        res.should.have.status(400);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      })
  });
  it("2. should create a new user(customer) - 200 Email Sent", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/register")
      .send(newUser)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        res.body.should.have.property('tempData')
        newUser.verificationToken = res.body.tempData.token;
        done();
      })
  });
  it("3. should verify a user's email address - 200 Updated", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/verify_email")
      .send({
        "token": newUser.verificationToken
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("4. should NOT create user | as there already exists - 404 Not Found", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/register")
      .send(newUser)
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("5. should NOT send a verfication email | it is verified - 404 Not Found", (done) => {
    chai.request(`${process.env.API_URL}`)
      .get("auth/verify_email/" + newUser.email)
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("6. should NOT authenticate user | wrong credentials - 404 Not Found", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/authenticate")
      .send({
        email: newUser.email,
        password: "random_password"
      })
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("7. should send a restoration email - 200 Email Sent", (done) => {
    chai.request(`${process.env.API_URL}`)
      .get("auth/forgot_pass/" + newUser.email)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        res.body.should.have.property('tempData')
        newUser.restorationToken = res.body.tempData.token;
        done();
      });
  });
  it("8. should NOT validate restoration token | it is wrong - 404 Not Found", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/forgot_pass")
      .send({
        token: "random_token"
      })
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("9. should validate restoration token - 200 Updated", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/forgot_pass")
      .send({
        token: newUser.restorationToken
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("10. should NOT restore password | wrong verification password - 404 Not Found", (done) => {
    chai.request(`${process.env.API_URL}`)
      .put("auth/forgot_pass")
      .send({
        token: newUser.restorationToken,
        newPassword: "new_password",
        verPassword: "random_password"
      })
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("11. should restore password - 200 Updated", (done) => {
    chai.request(`${process.env.API_URL}`)
      .put("auth/forgot_pass")
      .send({
        token: newUser.restorationToken,
        newPassword: "new_password",
        verPassword: "new_password"
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
  it("12. should authenticate user - 200 Authenticate", (done) => {
    chai.request(`${process.env.API_URL}`)
      .post("auth/authenticate")
      .send({
        email: newUser.email,
        password: "new_password"
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('data');
        res.body.data.should.be.a('object');
        res.body.data.should.have.property('user');
        res.body.data.should.have.property('token');
        newUser.authToken = res.body.data.token.token;
        done();
      });
  });
  it("13. should update user's password - 200 Updated", (done) => {
    chai.request(`${process.env.API_URL}`)
      .put("auth/change_pass")
      .set('Authorization', 'Bearer ' + newUser.authToken)
      .send({
        oldPassword: "new_password",
        newPassword: newUser.password
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        done();
      });
  });
});
