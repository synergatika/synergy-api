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
import { newUser, defaultAdmin, defaultMerchant, defaultCustomer, newCustomer, newMerchant, offers } from './_structs.test'
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');

// Eth
import { BlockchainService } from '../src/utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

var accounts = [{ //0
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
}, {//4
    ad: '0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2',
    pk: '0x388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418'
}, {//5
    ad: '0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e',
    pk: '0x659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63'
}, {//6
    ad: '0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5',
    pk: '0x82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8'
}, {//7
    ad: '0x0F4F2Ac550A1b4e2280d04c21cEa7EBD822934b5',
    pk: '0xaa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7'
}, {//8
    ad: '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
    pk: '0x0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4'
}, {//9
    ad: '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
    pk: '0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
}]



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
        return userModel.deleteOne({
            email: newUser.email
        });
    })
    before(() => {
        return userModel.deleteOne({
            email: defaultCustomer.email
        });
    });
    before(() => {
        return userModel.deleteOne({
            email: defaultMerchant.email
        });
    })
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
                account: serviceInstance.lockWallet(accounts[0].pk, defaultAdmin.password)
            });
        });
    });
    before(() => {
        return bcrypt.hash(defaultCustomer.password, 10, (err, hash) => {
            return userModel.create({
                email: defaultCustomer.email,
                access: 'customer',
                verified: 'true',
                password: hash,
                email_verified: true,
                pass_verified: true,
                account: serviceInstance.lockWallet(accounts[1].pk, defaultCustomer.password)
            });
        });
    });
    before(() => {
        return bcrypt.hash(defaultMerchant.password, 10, (err, hash) => {
            return userModel.create({
                email: defaultMerchant.email,
                access: 'merchant',
                verified: 'true',
                password: hash,
                email_verified: true,
                pass_verified: true,
                account: serviceInstance.lockWallet(accounts[2].pk, defaultMerchant.password)
            });
        });
    });

    after((done) => {
        mongoose.disconnect().then(() => { done(); });
    });

    describe("Auth (/auth)", () => {
        it("1. should create a new user (auto-registration as customer)", (done) => {
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
        it("2. should verify a user's email address", (done) => {
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
        it("3. should NOT create user | as there is already user with these email address)", (done) => {
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
        it("4. should NOT send a verfication email | as user has already verified email address", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("auth/verify_email/" + newUser.email)
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("5. should NOT authenticate user | due to wrong credentials", (done) => {
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
        it("6. should send a restoration email", (done) => {
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
        it("7. should NOT validate restoration token | as it is wrong", (done) => {
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
        it("8. should validate restoration token", (done) => {
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
        it("9. should NOT update/restore password | as does not match with verification password", (done) => {
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
        it("10. should update/restore password", (done) => {
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
        it("11. should authenticate user", (done) => {
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
        it("12. should update user's password", (done) => {
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
