import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant_1, defaultMerchant_2, offers, posts } from './_structs.test'

describe("Merchant", () => {
  describe("Offers (/loyalty/offers)", () => {
    it("1. should update an offer - 200 Updated", (done) => {
      var _date = new Date();
      var _newDate = _date.setMonth(_date.getMonth() + 3);

      chai.request(`${process.env.API_URL}`)
        .put("loyalty/offers/" + defaultMerchant_1._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          description: 'Two Years Free Hosting',
          cost: 5000,
          expiresAt: _newDate.toString()
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2. should NOT update offer | not belong to user - 403 Forbidden", (done) => {
      var _date = new Date();
      var _newDate = _date.setMonth(_date.getMonth() + 6);

      chai.request(`${process.env.API_URL}`)
        .put("loyalty/offers/" + defaultMerchant_1._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          description: 'Three Years Free Hosting',
          cost: 6000,
          expiresAt: _newDate.toString()
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("3. should delete an offer - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .delete("loyalty/offers/" + defaultMerchant_1._id + "/" + offers[1].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Posts & Events (/community)", () => {
    it("1. should update an event - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("community/" + defaultMerchant_1._id + "/" + posts[0].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          content: 'Updated Content',
          type: 'event',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2. should NOT update offer | not belong to user - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("community/" + defaultMerchant_1._id + "/" + posts[0].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          content: 'Updated Content',
          type: 'event',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("3. should delete a post/event - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .delete("community/" + defaultMerchant_1._id + "/" + posts[1].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
