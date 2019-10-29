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
                pass_verified: true
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
                pass_verified: true
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
                pass_verified: true
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
