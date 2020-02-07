import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant_1, defaultMerchant_2, defaultMerchant_3, offers, posts, events } from './_structs.test'

describe("Merchant", () => {
  describe("Offers (/loyalty/offers)", () => {
    it("1. should update an offer - 200 Updated", (done) => {
      var _date = new Date();
      var _newDate = _date.setMonth(_date.getMonth() + 3);

      chai.request(`${process.env.API_URL}`)
        .put("loyalty/offers/" + defaultMerchant_3._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .send({
          title: 'Update Offer',
          description: 'Two Years Free Hosting',
          cost: (5000).toString(),
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
        .put("loyalty/offers/" + defaultMerchant_3._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          title: 'Update Offer',
          description: 'Three Years Free Hosting',
          cost: (6000).toString(),
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
        .delete("loyalty/offers/" + defaultMerchant_3._id + "/" + offers[1].offer_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Posts (/posts)", () => {
    it("1. should update an post - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("posts/" + defaultMerchant_1._id + "/" + posts[1].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          title: 'Update Post',
          content: 'Updated Content',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2. should NOT update post | not belong to user - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("posts/" + defaultMerchant_1._id + "/" + posts[1].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          title: 'Update Post',
          content: 'Updated Content',
          access: 'private'
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("3. should delete a post - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .delete("posts/" + defaultMerchant_1._id + "/" + posts[1].post_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("Events (/events)", () => {
    it("1. should update an event - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("events/" + defaultMerchant_1._id + "/" + events[0].event_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .send({
          title: 'Update Event',
          description: 'Updated Event',
          access: 'private',
          location: 'Salonika',
          dateTime: '2036-01-02'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2. should NOT update offer | not belong to user - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("events/" + defaultMerchant_1._id + "/" + events[0].event_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_2.authToken)
        .send({
          title: 'Update Event',
          description: 'Updated Event',
          access: 'private',
          location: 'Salonika',
          dateTime: '2036-01-02'
        })
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("3. should delete a event - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .delete("events/" + defaultMerchant_1._id + "/" + events[1].event_id)
        .set('Authorization', 'Bearer ' + defaultMerchant_1.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
