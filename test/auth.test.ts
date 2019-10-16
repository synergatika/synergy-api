import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
import { CommandCursor } from 'mongodb';
validateEnv();

import userModel from '../src/models/user.model'
import { defaultCustomer, defaultMerchant, defaultAdmin, newUser, newCustomer, newMerchant } from './structs.test'
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

describe("Test All in One", () => {

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
        return userModel.deleteMany({
            $or: [{ email: newUser.email },
            { email: newCustomer.email },
            { email: newMerchant.email },
            { email: defaultCustomer.email },
            { email: defaultMerchant.email },
            { email: defaultAdmin.email }]
        });
    })
    before(() => {
        return bcrypt.hash(defaultCustomer.password, 10, (err, hash) => {
            return userModel.create({
                email: defaultCustomer.email,
                access: 'customer',
                verified: 'true',
                password: hash,
            })
        })
    });
    before(() => {
        return bcrypt.hash(defaultMerchant.password, 10, (err, hash) => {
            return userModel.create({
                email: defaultMerchant.email,
                access: 'merchant',
                verified: 'true',
                password: hash,
            })
        })
    });
    before(() => {
        console.log(typeof (`${process.env.API_URL}`));
        return bcrypt.hash(defaultAdmin.password, 10, (err, hash) => {
            return userModel.create({
                email: defaultAdmin.email,
                access: 'admin',
                verified: 'true',
                password: hash,
            })
        })
    });

    after((done) => {
        mongoose.disconnect().then(() => { done(); });
    });

    describe("Customer", () => {

        describe("Customer Auth (/auth)", () => {
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

        describe("Customer's Profile (/profile)", () => {
            it("1. should read user's profile", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .get("profile")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('data');
                        res.body.data.should.be.a('object');
                        done();
                    });
            });
            it("2. should NOT update customer's profile | as name is empty", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("profile")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .send({
                        imageURL: "http://customer_image.com"
                    })
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message');
                        done();
                    });
            });
            it("3. should update customer's profile", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("profile")
                    .set('Authorization', 'Bearer ' + newUser.authToken)
                    .send({
                        imageURL: "http://customer_image.com",
                        name: "Random Name"
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
    });

    describe("Merchant", () => {
        describe("Merchant Auth (/auth)", () => {
            it("1. should authenticate user", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/authenticate")
                    .send({
                        email: defaultMerchant.email,
                        password: defaultMerchant.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('data');
                        res.body.data.should.be.a('object');
                        res.body.data.should.have.property('user');
                        res.body.data.should.have.property('token');
                        defaultMerchant._id = res.body.data.user._id;
                        defaultMerchant.authToken = res.body.data.token.token;
                        done();
                    });
            });
            it("2. should NOT create a new merchant | as customer cannot create customer", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/register/" + "merchant")
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
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
            it("3. should create a new customer", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/register/" + "customer")
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: newCustomer.name,
                        email: newCustomer.email
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        newCustomer.password = res.body.tempData.password;
                        done();
                    });
            });
            it("4. should authenticate the new customer", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/authenticate/")
                    .send({
                        email: newCustomer.email,
                        password: newCustomer.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('data');
                        res.body.data.should.be.a('object');
                        res.body.data.should.have.property('user');
                        res.body.data.should.have.property('token');
                        done();
                    });
            });
        });

        describe("Merchant's Profile(Info) (/merchants)", () => {
            it("1. should NOT update merchant's profile(info) | as it does not belong to logged in user", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("merchants/" + 'random_id')
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
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
            it("2. should NOT update merchant's profile(info) | as it does not belong to logged in user", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("merchants/" + defaultMerchant._id)
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
            it("3. should update merchant's profile(info)", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("merchants/" + defaultMerchant._id)
                    .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                    .send({
                        name: "New Merchant Name",
                        imageURL: "http://url_merchant.gr",
                        contact: {
                            phone: 2105555555,
                            websiteURL: 'www.merchant_shop.gr',
                            address: {
                                street: "My Street",
                                zipCode: 10000,
                                city: "Athens"
                            }
                        },
                        sector: "Durables"
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
    });

    describe("Admin", () => {

        describe("Admin Auth (/auth)", () => {
            it("1. should authenticate user", (done) => {
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
            it("2. should update password", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("auth/change_pass")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        oldPassword: defaultAdmin.password,
                        newPassword: 'new_password'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message');
                        done();
                    });
            });
            it("3. should authenticate user", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/authenticate")
                    .send({
                        email: defaultAdmin.email,
                        password: 'new_password'
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
            it("4. should update password", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .put("auth/change_pass")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        oldPassword: 'new_password',
                        newPassword: defaultAdmin.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                    });
            });
            it("5. should create a new merchant", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/register/" + "merchant")
                    .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
                    .send({
                        name: newMerchant.name,
                        email: newMerchant.email
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message');
                        newMerchant.password = res.body.tempData.password;
                        done();
                    });
            });
            it("6. should NOT authenticate the new merchant | as password is empty", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/authenticate/")
                    .send({
                        email: newMerchant.email,
                    })
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message');
                        done();
                    });
            });
            it("7. should authenticate the new merchant", (done) => {
                chai.request(`${process.env.API_URL}`)
                    .post("auth/authenticate/")
                    .send({
                        email: newMerchant.email,
                        password: newMerchant.password
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('data');
                        res.body.data.should.be.a('object');
                        res.body.data.should.have.property('user');
                        res.body.data.should.have.property('token');
                        done();
                    });
            });
        });
    });

    describe("No Login Required (/merchants)", () => {
        it("1. should read all merchants", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("merchants/")
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('array');
                    done();
                });
        });
        it("2. should read a merchant's info", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("merchants/" + defaultMerchant._id)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    done();
                });
        });
        it("3. should NOT read anything | as url does not exist", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("random_url/")
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    done();
                });
        });
    });
});

