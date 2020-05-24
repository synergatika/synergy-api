import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import { partner_a, user_a, microcredit_a, microcredit_b } from './_structs.test';
var a1_support_id: string = '';
var a2_support_id: string = '';
var a3_support_id: string = '';
var b1_support_id: string = '';
var b2_support_id: string = '';

describe("Microcredit", () => {
  describe("Promise, Receive, Spend Fund", () => {
    it("1. should NOT promise fund | as max allowed - Not Found ", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 100
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should NOT promise fund | as min allowed - Not Found ", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 5
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should promise fund by partner - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_a._id + "/" + user_a.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          method: 'store',
          _amount: 10,
          paid: false
        })
        .end((err, res) => {
          console.log(res.body);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          a1_support_id = res.body.data.support_id;
          done();
        });
    });
    it("4. should NOT promise fund | as payment method is not supoorted - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'EFGBGRAA',
          _amount: 20,
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should promise fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 20,
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          a2_support_id = res.body.data.support_id;
          done();
        });
    });
    it("6. should receive fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/confirm/" + partner_a._id + "/" + microcredit_a._id + "/" + a2_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("7. should NOT revert fund | as redeeming period has started - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/confirm/" + partner_a._id + "/" + microcredit_a._id + "/" + a2_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("8. should NOT spend fund | as it is unpaid - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/redeem/" + partner_a._id + "/" + microcredit_a._id + "/" + a1_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          _tokens: 10
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("9. should spend fund - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/redeem/" + partner_a._id + "/" + microcredit_a._id + "/" + a2_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          _tokens: 10
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("10. should NOT spend fund | as not enough tokens - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/redeem/" + partner_a._id + "/" + microcredit_a._id + "/" + a2_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .send({
          _tokens: 20
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("11. should promise fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_b._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 30,
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          b1_support_id = res.body.data.support_id;
          done();
        });
    });
    it("12. should NOT promise fund | as excented max amount - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_b._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 20,
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("13. should NOT promise fund | as less than min amount - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_b._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 3,
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("14. should promise fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/earn/" + partner_a._id + "/" + microcredit_b._id)
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 10,
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          b2_support_id = res.body.data.support_id;
          done();
        });
    });
    it("15. should receive fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/confirm/" + partner_a._id + "/" + microcredit_b._id + "/" + b1_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("16. should revert fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/confirm/" + partner_a._id + "/" + microcredit_b._id + "/" + b1_support_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Transactions, Supports", () => {
    it("1. should read user's supports - 200 Supports", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/supports/0-0-0")
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should NOT read campaigns's supports | as not belongs - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/supports/" + '5e6a7f6f6e9b481292dcb376' + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should read campaigns's supports - 200 Supports", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/supports/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("4. should read user's supports in specific campaign - 200 Supports", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/supports/" + partner_a._id + "/" + microcredit_a._id + "/" + user_a.email)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("5. should read member's transaction - 200 Transactions", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/transactions/" + '0-0-0')
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
});
