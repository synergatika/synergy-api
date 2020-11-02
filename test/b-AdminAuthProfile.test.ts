import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import * as fs from 'fs';

import { imagesLocation, defaultAdmin, partner_a, partner_b, user_a } from './_structs.test';

describe("Admin - Authentication", () => {
  describe("Admin - Authentication (/auth)", () => {
    it("1. should authenticate user as Admin - 200 Authenticate", (done) => {
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
  });
  describe("Admin - Register Partner (/auth)", () => {
    it("1. should create user as Partner - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', partner_a.email)
        .field('name', partner_a.name)
        .field('subtitle', partner_a.subtitle)
        .field('description', partner_a.description)
        .field('timetable', partner_a.timetable)
        .field('phone', partner_a.contact.phone)
        .field('websiteURL', partner_a.contact.websiteURL)
        .field('street', partner_a.address.street)
        .field('postCode', partner_a.address.postCode)
        .field('city', partner_a.address.city)
        .field('lat', partner_a.address.coordinates[0])
        .field('long', partner_a.address.coordinates[1])
        .field('sector', partner_a.sector)
        .field('payments', JSON.stringify(partner_a.payments))
        // .field('nationalBank', partner_a.payments.nationalBank)
        // .field('pireausBank', partner_a.payments.pireausBank)
        // .field('eurobank', partner_a.payments.eurobank)
        // .field('alphaBank', partner_a.payments.alphaBank)
        // .field('paypal', partner_a.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_a.imageFile}`), `${partner_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          partner_a.tempPass = res.body.tempData.password;
          console.log(err)
          console.log(res.body)
          done();
        });
    });
    it("2. should create user as Partner - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .field('email', partner_b.email)
        .field('name', partner_b.name)
        .field('subtitle', partner_b.subtitle)
        .field('description', partner_b.description)
        .field('timetable', partner_b.timetable)
        .field('phone', partner_b.contact.phone)
        .field('websiteURL', partner_b.contact.websiteURL)
        .field('street', partner_b.address.street)
        .field('postCode', partner_b.address.postCode)
        .field('city', partner_b.address.city)
        .field('lat', partner_b.address.coordinates[0])
        .field('long', partner_b.address.coordinates[1])
        .field('sector', partner_b.sector)
        .field('payments', JSON.stringify(partner_b.payments))
        // .field('nationalBank', partner_b.payments.nationalBank)
        // .field('pireausBank', partner_b.payments.pireausBank)
        // .field('eurobank', partner_b.payments.eurobank)
        // .field('alphaBank', partner_b.payments.alphaBank)
        // .field('paypal', partner_b.payments.paypal)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_b.imageFile}`), `${partner_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          partner_b.tempPass = res.body.tempData.password;
          done();
        });
    });
  });
  describe("Admin - Register Member (/auth)", () => {
    it("1. should create user as Member - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/member")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: user_a.name,
          email: user_a.email
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          user_a.tempPass = res.body.tempData.password;
          done();
        });
    });
  });
});
