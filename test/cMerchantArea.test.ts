import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';

validateEnv();

import { defaultMerchant_1, newCustomer, newMerchant, customer01, offers } from './_structs.test'

describe("Merchant", () => {

    describe("Auth (/auth)", () => {
        it("1. should authenticate user (merchant) - 200 Authenticate", (done) => {
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
        it("2. should NOT create a new merchant | merchant cannot create merchant - 403 Forbidden", (done) => {
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
        it("3. should create a new customer - 200 Email Sent", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/register/" + "customer")
                .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
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
        it("4. should NOT authenticate the new customer | password not verified - 204 Need Verification", (done) => {
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
        it("5. should set a new password - 200 Updated", (done) => {
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
        it("6. should authenticate the new user (customer) - 200 Authenticate", (done) => {
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
                            city: "Athens"
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

    describe("Offers (/loyalty/offers) - 201 Created", () => {
        it("1. should create a new offer", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
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
        it("2. should NOT create a new offer | user is not merchant - 403 Forbidden", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + customer01.authToken)
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
        it("3. should create a new offer - 201 Created", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/offers/")
                .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
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