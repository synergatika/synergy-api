import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import { partner_a, user_a, user_c, user_d, offers } from './_structs.test';

describe("Loyalty", () => {
  describe("Earn & Redeem", () => {
    it("1. should earn points using email - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn/" + user_c.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          password: partner_a.password,
          _amount: 100
        })
        .end((err, res) => {
          console.log(err);
          console.log(res.body);
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("2. should earn points using card - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/earn/" + user_d.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          password: partner_a.password,
          _amount: 100
        })
        .end((err, res) => {
          console.log(err);
          console.log(res.body);
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("3. should use points using email with offer - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/redeem/" + partner_a._id + "/" + offers[0].offer_id + "/" + user_c.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          password: partner_a.password,
          _points: 50,
          quantity: 2
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
    it("4. should NOT use points | has not enough points - 404 Not Fpund", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/redeem/" + user_c.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          password: partner_a.password,
          _points: 500,
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should use points using card - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/redeem/" + user_c.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          password: partner_a.password,
          _points: 100,
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('receipt');
          done();
        });
    });
  });
  describe("Transactions, Balance, Badges", () => {
    it("1. should read user's activity - 200 Activity", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/badge")
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read member's balance using card - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/balance/" + user_c.card)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should user's balance - 200 Balance", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/badge")
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("4. should read member's transaction - 200 Transactions", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/transactions/" + '0-0-0')
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("5. should read partner's transactions - 200 Transactions", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/transactions/" + '0-0-0')
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("6. should read loyalty statistics - 200 LoyaltyStatistics", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/statistics")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
});
