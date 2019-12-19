import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';

validateEnv();

import userModel from '../src/models/user.model'
import transactionModel from '../src/models/transaction.model'
import {
  newUser, defaultAdmin, defaultMerchant_1, defaultMerchant_2, defaultMerchant_3,
  customer01, customer02, customer03, customer04, customer05,
  newCustomer, newMerchant, offers
} from './_structs.test'
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');

// Eth
import { BlockchainService } from '../src/utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

const Accounts = [{ //0
  ad: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  pk: '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
}, {//1
  ad: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
  pk: '0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f'
}, {//2
  ad: '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef',
  pk: '0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1'
}, {//3
  ad: '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
  pk: '0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c'
}];

describe("Establishing", () => {
  it("1. should establish a new DB Connection", (done) => {
    chai.request(`${process.env.API_URL}`)
      .get("status")
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('data')
        done();
      })
  });
});
describe("New Account", () => {
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
        .then(() => { done(); })
        .catch((err) => {
          console.log('*** Can Not Connect to Mongo Server:', 'mongodb://' + DB_HOST + ":" + DB_PORT + "/" + DB_NAME)
          console.log(err)
        })
    }
  });
  before(() => {
    return transactionModel.deleteMany({ createdAt: { $gt: 1573058654985 } });
  })
  before(() => {
    return userModel.deleteOne({
      email: newUser.email
    });
  })
  before(() => {
    return userModel.deleteOne({
      email: customer01.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: customer02.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: customer03.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: customer04.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: customer05.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: defaultMerchant_1.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: defaultMerchant_2.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: defaultMerchant_3.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: defaultAdmin.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: newCustomer.email
    });
  });
  before(() => {
    return userModel.deleteOne({
      email: newMerchant.email
    });
  });

  before(() => {
    return bcrypt.hash(defaultAdmin.password, 10, (err, hash) => {
      return userModel.create({
        email: defaultAdmin.email,
        access: 'admin',
        verified: 'true',
        password: hash,
        email_verified: true,
        pass_verified: true,
        account: serviceInstance.lockWallet(Accounts[0].pk, defaultAdmin.password)
      });
    });
  });
  before(() => {
    return bcrypt.hash(defaultMerchant_1.password, 10, (err, hash) => {
      return userModel.create({
        email: defaultMerchant_1.email,
        imageURL: defaultMerchant_1.imageURL,
        access: 'merchant',
        verified: 'true',
        password: hash,
        contact: defaultMerchant_1.contact,
        sector: defaultMerchant_1.sector,
        email_verified: true,
        pass_verified: true,
        account: serviceInstance.lockWallet(Accounts[1].pk, defaultMerchant_1.password)
      });
    });
  });
  before(() => {
    return bcrypt.hash(defaultMerchant_2.password, 10, (err, hash) => {
      return userModel.create({
        email: defaultMerchant_2.email,
        imageURL: defaultMerchant_2.imageURL,
        access: 'merchant',
        verified: 'true',
        password: hash,
        contact: defaultMerchant_2.contact,
        sector: defaultMerchant_2.sector,
        email_verified: true,
        pass_verified: true,
        account: serviceInstance.lockWallet(Accounts[2].pk, defaultMerchant_2.password)
      });
    });
  });
  /*before(() => {
    return bcrypt.hash(defaultMerchant_3.password, 10, (err, hash) => {
      return userModel.create({
        email: defaultMerchant_3.email,
        imageURL: defaultMerchant_3.imageURL,
        access: 'merchant',
        verified: 'true',
        password: hash,
        contact: defaultMerchant_3.contact,
        sector: defaultMerchant_3.sector,
        email_verified: true,
        pass_verified: true,
        account: serviceInstance.lockWallet(Accounts[3].pk, defaultMerchant_3.password)
      });
    });
  });*/
  before(() => {
    return bcrypt.hash(customer01.password, 10, (err, hash) => {
      return userModel.create({
        email: customer01.email,
        imageURL: customer01.imageURL,
        access: 'customer',
        verified: 'true',
        password: hash,
        email_verified: true,
        pass_verified: true,
        account: serviceInstance.lockWallet(Accounts[3].pk, customer01.password)
      });
    });
  });
  /*  before(() => {
      return bcrypt.hash(customer05.password, 10, (err, hash) => {
        return userModel.create({
          email: customer05.email,
          imageURL: customer05.imageURL,
          access: 'customer',
          verified: 'true',
          password: hash,
          email_verified: true,
          pass_verified: true,
          account: serviceInstance.lockWallet(Accounts[5].pk, customer05.password)
        });
      });
    });*/

  after((done) => {
    mongoose.disconnect().then(() => { done(); });
  });

  describe("Auth (/auth)", () => {
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
          console.log(err);
          console.log(res);
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
          newUser.password = 'new_password'
          done();
        });
    });
    it("12. should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: newUser.email,
          password: newUser.password
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
          oldPassword: newUser.password,
          newPassword: 'newest_password'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          newUser.password = 'newest_password';
          done();
        });
    });
  });
});
