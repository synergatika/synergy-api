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
import { defaultMerchant, newCustomer, newMerchant, defaultCustomer, offers, newUser } from './_structs.test'
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { array } from 'prop-types';


describe("Loyalty", () => {
    describe("Loyalty (/loyalty)", () => {
        it("1. should earn points", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/earn")
                .set('Authorization', 'Bearer ' + newMerchant.authToken)
                .send({
                    password: newMerchant.password,
                    _to: newUser.email,
                    _amount: 45
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("2. should NOT earn points | as password is wrong", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/earn")
                .set('Authorization', 'Bearer ' + newMerchant.authToken)
                .send({
                    password: 'random_pass',
                    _to: newCustomer.email,
                    _amount: 25
                })
                .end((err, res) => {
                    res.should.have.status(403);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("3. should earn points", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/earn")
                .set('Authorization', 'Bearer ' + newMerchant.authToken)
                .send({
                    password: newMerchant.password,
                    _to: newCustomer.email,
                    _amount: 25
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("4. should read balance", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("loyalty/balance")
                .set('Authorization', 'Bearer ' + newCustomer.authToken)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.data.should.be.a('object');
                    console.log(res.body);
                    done();
                });
        });
        it("5. should use points", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("loyalty/redeem")
                .set('Authorization', 'Bearer ' + newMerchant.authToken)
                .send({
                    password: newMerchant.password,
                    _to: newUser.email,
                    _points: 15
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    console.log(res.body);
                    done();
                });
        });
    });
});