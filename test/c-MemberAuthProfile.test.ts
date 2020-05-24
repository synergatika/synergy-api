import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import * as fs from 'fs';

import { imagesLocation, user_a, user_b } from './_structs.test';

describe("Member - Authentication & Profile", () => {
    describe("Member (Admin Registration) - Authentication (/auth)", () => {
        it("1. sould NOT authenticate member | password is not verified - 202 VerificationRequired", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate/")
                .send({
                    email: user_a.email,
                    password: user_a.tempPass
                })
                .end((err, res) => {
                    res.should.have.status(202);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.action.should.be.equal('need_password_verification');
                    done();
                });
        });
        it("2. should NOT set a new password | password is wrong - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/set_pass/" + user_a.email)
                .send({
                    oldPassword: 'random_password',
                    newPassword: user_a.password
                })
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("3. should set a new password - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/set_pass/" + user_a.email)
                .send({
                    oldPassword: user_a.tempPass,
                    newPassword: user_a.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("4. should NOT set a new password | password is verified - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/set_pass/" + user_a.email)
                .send({
                    oldPassword: 'random_password',
                    newPassword: user_a.password
                })
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("5. should authenticate user - 200 Authenticate", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate")
                .send({
                    email: user_a.email,
                    password: user_a.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    res.body.data.should.have.property('user');
                    res.body.data.should.have.property('token');
                    user_a.authToken = res.body.data.token.token;
                    user_a._id = res.body.data.user._id;
                    done();
                });
        });
    });
    describe("Member (Auto Registration) - Authentication (/auth)", () => {
        it("1. should create a new member - 200 EmailSent", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/auto-register/member")
                .send({
                    email: user_b.email,
                    password: user_b.password,
                    name: user_b.name
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    res.body.should.have.property('tempData')
                    user_b.verificationToken = res.body.tempData.token;
                    done();
                })
        });
        it("2. sould NOT authenticate member | email is not verified - 202 VerificationRequired", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate/")
                .send({
                    email: user_b.email,
                    password: user_b.password
                })
                .end((err, res) => {
                    res.should.have.status(202);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.action.should.be.equal('need_email_verification');
                    user_b.verificationToken = res.body.tempData.token;
                    done();
                });
        });
        it("3. should NOT validate verification token | token is wrong - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/verify_email")
                .send({
                    "token": 'random_token'
                })
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("4. should verify a user's email address - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/verify_email")
                .send({
                    "token": user_b.verificationToken
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("5. should authenticate user - 200 Authenticate", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate")
                .send({
                    email: user_b.email,
                    password: user_b.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    res.body.data.should.have.property('user');
                    res.body.data.should.have.property('token');
                    user_b.authToken = res.body.data.token.token;
                    user_b._id = res.body.data.user._id;
                    done();
                });
        });
    });
    describe("Member - Authentication (/auth)", () => {
        it("1. should NOT create a new member | as password is missing - 400 BadRequest", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/auto-register/member")
                .send({
                    email: 'random_email@email.com'
                })
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                })
        });
        it("2. should NOT create user | as already exists - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/auto-register/member")
                .send(user_a)
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("2. should NOT send a verfication email | email is verified - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("auth/verify_email/" + user_a.email)
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("3. should send a restoration email - 200 EmailSent", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("auth/forgot_pass/" + user_b.email)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    res.body.should.have.property('tempData')
                    user_b.restorationToken = res.body.tempData.token;
                    done();
                });
        });
        it("5. should NOT validate restoration token | it is wrong - 404 NotFound", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/forgot_pass")
                .send({
                    token: 'random_token'
                })
                .end((err, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("6. should validate restoration token - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/forgot_pass")
                .send({
                    token: user_b.restorationToken
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("7. should restore password - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/forgot_pass")
                .send({
                    token: user_b.restorationToken,
                    newPassword: 'new_password',
                    verPassword: 'new_password'
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("8. should update member's password - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/change_pass")
                .set('Authorization', 'Bearer ' + user_b.authToken)
                .send({
                    oldPassword: 'new_password',
                    newPassword: user_b.password
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("9. should deactivate member's account - 200 Email Sent", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("auth/deactivate")
                .set('Authorization', 'Bearer ' + user_b.authToken)
                .send({
                    reason: 'One random Reason',
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("10. sould NOT authenticate member | account is not activated - 202 ActivationRequired", (done) => {
            chai.request(`${process.env.API_URL}`)
                .post("auth/authenticate/")
                .send({
                    email: user_b.email,
                    password: user_b.password
                })
                .end((err, res) => {
                    res.should.have.status(202);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.action.should.be.equal('need_account_activation');
                    done();
                });
        });
    });
    describe("Member - Profile (/profile)", () => {
        it("1. should read member's profile - 200 Member", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("profile")
                .set('Authorization', 'Bearer ' + user_a.authToken)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    done();
                });
        });
        it("2. should NOT update member's profile | No auth - 401 Unauthorized", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + 'random_token')
                .attach('imageURL', fs.readFileSync(`${imagesLocation}/${user_a.imageFile}`),
                    `${user_a.imageFile}`)
                .end((err, res) => {
                    res.should.have.status(401);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("3. should NOT update member's profile | name is missing - 400 BadRequest", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + user_a.authToken)
                .attach('imageURL', fs.readFileSync(`${imagesLocation}/${user_a.imageFile}`),
                    `${user_a.imageFile}`)
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("4. should update member's profile | even if image is missing - 200Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + user_a.authToken)
                .attach('imageURL', fs.readFileSync(`${imagesLocation}/${user_a.imageFile}`),
                    `${user_a.imageFile}`)
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    done();
                });
        });
        it("5. should update member's profile - 200 Updated", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("profile")
                .set('Authorization', 'Bearer ' + user_a.authToken)
                .field('name', "Demo User")
                .attach('imageURL', fs.readFileSync(`${imagesLocation}/${user_a.imageFile}`),
                    `${user_a.imageFile}`)
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