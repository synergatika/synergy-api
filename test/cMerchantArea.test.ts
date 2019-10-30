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
import { defaultMerchant, newCustomer, newMerchant, defaultCustomer, offers } from './_structs.test'
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { array } from 'prop-types';


describe("Merchant", () => {

    describe("Auth (/auth)", () => {
        it("1. should authenticate user (merchant)", (done) => {
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
        it("2. should NOT create a new merchant | as merchant cannot create merchant", (done) => {
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
                    newCustomer.tempPass = res.body.tempData.password;
                    done();
                });
        });
        it("4. should NOT authenticate the new customer | as password is random and has not be changed", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate/")
                .send({
                    email: newCustomer.email,
                    password: newCustomer.tempPass
                })
                .end((err, res) => {
                    res.should.have.status(204);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("5. should set a new password", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/set_pass/" + newCustomer.email)
                .send({
                    oldPassword: newCustomer.tempPass,
                    newPassword: newCustomer.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("6. should authenticate the new customer", (done) => {
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
                    newCustomer.authToken = res.body.data.token.token;
                    done();
                });
        });
    });

    describe("Profile (/merchants)", () => {
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

    describe("Offers (/loyalty/offers)", () => {
        it("1. should create a new offer", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                .send({
                    description: '2 + 1 Beers',
                    cost: 1300,
                    expiresAt: '2019-10-22'
                })
                .end((err, res) => {
                    res.should.have.status(201);
                    res.body.should.be.a('object');
                    done();

                });
        });
        it("2. should NOT create a new offer | as user is not a merchant", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + defaultCustomer.authToken)
                .send({
                    description: 'Free meals at Sundays',
                    cost: 2000,
                    expiresAt: '2019-12-22'
                })
                .end((err, res) => {
                    res.should.have.status(403);
                    res.body.should.be.a('object');
                    done();

                });
        });
        it("3. should create a new offer", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                .send({
                    description: 'Free meals at Sundays',
                    cost: 2000,
                    expiresAt: '2019-12-22'
                })
                .end((err, res) => {
                    res.should.have.status(201);
                    res.body.should.be.a('object');
                    done();

                });
        });
    });
});