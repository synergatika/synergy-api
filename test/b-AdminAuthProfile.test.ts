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
        .post("auth/register/invite-partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          email: partner_a.email,
          password: partner_a.password,
          name: partner_a.name,
          sector: partner_a.sector
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          partner_a.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("2. should create user as Partner - 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/register/invite-partner")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          email: partner_b.email,
          password: partner_b.password,
          name: partner_b.name,
          sector: partner_b.sector
        })
        // .field('email', partner_b.email)
        // .field('name', partner_b.name)
        // .field('subtitle', partner_b.subtitle)
        // .field('description', partner_b.description)
        // .field('timetable', partner_b.timetable)
        // .field('phone', partner_b.contact.phone)
        // .field('websiteURL', partner_b.contact.websiteURL)
        // .field('street', partner_b.address.street)
        // .field('postCode', partner_b.address.postCode)
        // .field('city', partner_b.address.city)
        // .field('lat', partner_b.address.coordinates[0])
        // .field('long', partner_b.address.coordinates[1])
        // .field('sector', partner_b.sector)
        // .field('payments', JSON.stringify(partner_b.payments))
        // .attach('imageURL', fs.readFileSync(`${imagesLocation}/${partner_b.imageFile}`), `${partner_b.imageFile}`)
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
        .post("auth/register/invite-member")
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
