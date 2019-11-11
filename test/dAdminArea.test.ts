import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultAdmin, newMerchant } from './_structs.test'

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
                    newMerchant.tempPass = res.body.tempData.password;
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
        it("7. sould NOT authenticate the new merchant | as password is random and has not be changed", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate/")
                .send({
                    email: newMerchant.email,
                    password: newMerchant.tempPass
                })
                .end((err, res) => {
                    res.should.have.status(204);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("8. should set a new password", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/set_pass/" + newMerchant.email)
                .send({
                    oldPassword: newMerchant.tempPass,
                    newPassword: newMerchant.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("9. should authenticate the new merchant", (done) => {
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

                    newMerchant.authToken = res.body.data.token.token;
                    done();
                });
        });
    });
});

