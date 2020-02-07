import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant_1, offers, posts, events } from './_structs.test'


describe("Without Login", () => {
  describe("Merchants (/merchants)", () => {
    it("1. should read all merchants - 200 Merchants", (done) => {
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
    it("2. should read a merchant's info - 200 Merchant", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("merchants/" + defaultMerchant_1._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
    it("3. should NOT read anything | url not exist = 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("random_url/")
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Offers (/loyalty/offers)", () => {
    it("1. should read all offers - 200 Offers", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');

          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            offers.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("2. should read all merchant's offers - 200 Offers", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/" + defaultMerchant_1._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Posts (/posts)", () => {
    it("1. should read all posts - 200 Posts", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("posts/public/")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');

          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            posts.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("2. should read all merchant's posts - 200 Posts", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("posts/public/" + defaultMerchant_1._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Events (/events)", () => {
    it("1. should read all events - 200 Events", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/public/")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');

          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            events.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("2. should read all merchant's events - 200 Events", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/public/" + defaultMerchant_1._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
