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
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { defaultCustomer } from './_structs.test'

describe("Customer", () => {

    describe("Profile (/profile)", () => {
        it("1. should authenticate user (customer)", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate")
                .send({
                    email: defaultCustomer.email,
                    password: defaultCustomer.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    res.body.data.should.have.property('user');
                    res.body.data.should.have.property('token');
                    defaultCustomer.authToken = res.body.data.token.token;
                    done();
                });
        });
        it("2. should read user's profile", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("profile")
                .set('Authorization', 'Bearer ' + defaultCustomer.authToken)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    done();
                });
        });
        it("3. should NOT update customer's profile | as name is empty", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + defaultCustomer.authToken)
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
        it("4. should update customer's profile", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + defaultCustomer.authToken)
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

