import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import * as fs from 'fs';

import { imagesLocation, partner_a, partner_b, partner_c, user_c, user_d, user_e } from './_structs.test';

describe("Partner - Authentication & Profile", () => {
  describe("Partner - Authentication (/auth)", () => {
    it("1. sould NOT authenticate partner | password is not verified - 202 VerificationRequired", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate/")
        .send({
          email: partner_a.email,
          password: partner_a.tempPass
        })
        .end((err, res) => {
          res.should.have.status(202);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.action.should.be.equal('need_password_verification');
          done();
        });
    });
    it("2. should set a new password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/set_pass/" + partner_a.email)
        .send({
          oldPassword: partner_a.tempPass,
          newPassword: 'new_password'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: partner_a.email,
          password: 'new_password'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          partner_a.authToken = res.body.data.token.token;
          partner_a._id = res.body.data.user._id;
          done();
        });
    });
    it("4. should update partner's password - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/change_pass")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          oldPassword: 'new_password',
          newPassword: partner_a.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should register a new partner - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/auto-partner")
        .send({
          email: partner_c.email,
          name: partner_c.name,
          password: partner_c.password,
          sector: partner_c.sector,
        })
        // .field('email', partner_c.email)
        // .field('name', partner_c.name)
        // .field('password', partner_c.password)
        // .field('payments', JSON.stringify(partner_c.payments))
        // .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.imageFile}`), `${partner_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          //partner_c.oneClickToken = res.body.data.oneClickToken;
          done();
        });
    });
  });
  describe("Partner - Register Member (/auth)", () => {
    it("1. should NOT create user as Member | as email and card are missing - 400 BadRequest", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-member")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should NOT create user as Member | as token is wrong - 401 Unauthorized", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-member")
        .set('Authorization', 'Bearer ' + 'random_token')
        .send({
          email: user_c.email,
        })
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should create user as Member (email) - 200 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-member")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          email: user_c.email
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          user_c.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("4. should create user as Member (card) - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-member")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          card: user_d.card
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          //user_c.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("5. should create user as Member (email & card) - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-member")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          email: user_e.email,
          card: user_e.card
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          user_e.tempPass = res.body.tempData.password;
          done();
        });
    });
  });
  describe("Partner - Link Cards, Emails (/auth)", () => {
    it("1. should check identifier | is email has no card - 200 RegistrationStatus", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("auth/check_identifier/" + user_c.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.status.should.be.equal('email_no_card');
          done();
        });
    });
    it("2. should check identifier | is card has no email - 200 RegistrationStatus", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("auth/check_identifier/" + user_d.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.status.should.be.equal('card_no_email');
          done();
        });
    });
    it("3. should check identifier | is email has both - 200 RegistrationStatus", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("auth/check_identifier/" + user_e.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.status.should.be.equal('email_both');
          done();
        });
    });
    it("4. should check identifier | is card has both - 200 RegistrationStatus", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("auth/check_identifier/" + user_e.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.status.should.be.equal('card_both');
          done();
        });
    });
    it("5. should NOT link a card | has already card - 404 NotFound", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_card/" + user_e.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          card: '1111111111111111'
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("6. should NOT link an email | has already email - 404 NotFound", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_email/" + user_e.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          email: 'random_email@email.com'
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("7. should NOT link a card | card is registered to other user - 404 NotFound", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_card/" + user_c.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          card: user_e.card
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("8. should NOT link an email | email is registered to other user - 404 NotFound", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_email/" + user_d.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          email: user_e.email
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("9. should link a card - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_card/" + user_c.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          card: user_c.card
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("10. should link an email - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/link_email/" + user_d.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          email: user_d.email
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          user_d.tempPass = res.body.tempData.password;
          done();
        });
    });
  });
  describe("Partner - Profile (/partners)", () => {
    it("1. should read partner's profile - 200 Partner", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("partners/" + partner_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should NOT update partner's profile | not belong to - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + '5e6a7f6f6e9b481292dcb376')
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('name', partner_a.name)
        .field('subtitle', partner_a.subtitle)
        .field('description', partner_a.updatedDescription)
        .field('timetable', partner_a.timetable)
        .field('phone', partner_a.contact.phone)
        .field('websiteURL', partner_a.contact.websiteURL)
        .field('street', partner_a.updatedAddress.street)
        .field('postCode', partner_a.updatedAddress.postCode)
        .field('city', partner_a.updatedAddress.city)
        .field('lat', partner_a.updatedAddress.coordinates[0])
        .field('long', partner_a.updatedAddress.coordinates[1])
        .field('sector', partner_a.sector)
        .field('payments', JSON.stringify(partner_a.payments))
        // .field('nationalBank', partner_a.payments.nationalBank)
        // .field('pireausBank', partner_a.payments.pireausBank)
        // .field('eurobank', partner_a.payments.eurobank)
        // .field('alphaBank', partner_a.payments.alphaBank)
        // .field('paypal', partner_a.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.updatedImageFile}`), `${partner_a.updatedAddress}`)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should NOT update partner's profile | name is missing - 400 BadRequest", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + partner_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('subtitle', partner_a.subtitle)
        .field('description', partner_a.updatedDescription)
        .field('timetable', partner_a.timetable)
        .field('phone', partner_a.contact.phone)
        .field('websiteURL', partner_a.contact.websiteURL)
        .field('street', partner_a.updatedAddress.street)
        .field('postCode', partner_a.updatedAddress.postCode)
        .field('city', partner_a.updatedAddress.city)
        .field('lat', partner_a.updatedAddress.coordinates[0])
        .field('long', partner_a.updatedAddress.coordinates[1])
        .field('sector', partner_a.sector)
        .field('payments', JSON.stringify(partner_a.payments))
        // .field('nationalBank', partner_a.payments.nationalBank)
        //     .field('pireausBank', partner_a.payments.pireausBank)
        //     .field('eurobank', partner_a.payments.eurobank)
        //     .field('alphaBank', partner_a.payments.alphaBank)
        //     .field('paypal', partner_a.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.updatedImageFile}`), `${partner_a.updatedAddress}`)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should update partner's profile | even if description is missing - 200 Partner", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + partner_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('name', partner_a.name)
        .field('subtitle', partner_a.subtitle)
        .field('timetable', partner_a.timetable)
        .field('phone', partner_a.contact.phone)
        .field('websiteURL', partner_a.contact.websiteURL)
        .field('street', partner_a.updatedAddress.street)
        .field('postCode', partner_a.updatedAddress.postCode)
        .field('city', partner_a.updatedAddress.city)
        .field('lat', partner_a.updatedAddress.coordinates[0])
        .field('long', partner_a.updatedAddress.coordinates[1])
        .field('sector', partner_a.sector)
        .field('payments', JSON.stringify(partner_a.payments))
        // .field('nationalBank', partner_a.payments.nationalBank)
        //   .field('pireausBank', partner_a.payments.pireausBank)
        //   .field('eurobank', partner_a.payments.eurobank)
        //   .field('alphaBank', partner_a.payments.alphaBank)
        //   .field('paypal', partner_a.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.updatedImageFile}`), `${partner_a.updatedAddress}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("5. should update partner's profile - 200 Partner", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/" + partner_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('name', partner_a.name)
        .field('subtitle', partner_a.subtitle)
        .field('description', partner_a.updatedDescription)
        .field('timetable', partner_a.timetable)
        .field('phone', partner_a.contact.phone)
        .field('websiteURL', partner_a.contact.websiteURL)
        .field('street', partner_a.updatedAddress.street)
        .field('postCode', partner_a.updatedAddress.postCode)
        .field('city', partner_a.updatedAddress.city)
        .field('lat', partner_a.updatedAddress.coordinates[0])
        .field('long', partner_a.updatedAddress.coordinates[1])
        .field('sector', partner_a.sector)
        .field('payments', JSON.stringify(partner_a.payments))
        // .field('nationalBank', partner_a.payments.nationalBank)
        //   .field('pireausBank', partner_a.payments.pireausBank)
        //   .field('eurobank', partner_a.payments.eurobank)
        //   .field('alphaBank', partner_a.payments.alphaBank)
        //   .field('paypal', partner_a.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.updatedImageFile}`), `${partner_a.updatedImageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("7. should update partner's payments - 200 Partner", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("partners/payments/" + partner_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          payments: partner_a.payments
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
});
