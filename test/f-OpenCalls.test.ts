import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import { partner_a, microcredit_a, user_f } from './_structs.test';

describe("Open Calls", () => {
  describe("Community (/commmunity)", () => {
    it("1. should send an email = 200 EmailSent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("community/communicate")
        .send({
          sender: user_f.email,
          content: "Ζητώ ενημέρωση σχετικά με κάτι...",
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
  });
  describe("Partners (/partners)", () => {
    it("1. should NOT read partners | url not exist = 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("partners/")
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2. should read partners - 200 Partners", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("partners/public/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('array');
          done();
        });
    });
    it("3. should read partner - 200 Partner", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("partners/" + partner_a._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          done();
        });
    });
  });
  describe("Offers (/loyalty/offers)", () => {
    it("1. should read offers - 200 Offers", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/public" + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read partner's offers - 200 Offers", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/public/" + partner_a._id + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Posts (/posts)", () => {
    it("1. should read all posts - 200 Posts", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("posts/public/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read partner's posts - 200 Posts", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("posts/public/" + partner_a._id + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Events (/events)", () => {
    it("1. should read events - 200 Events", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/public/" + "0-0-0")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read partner's events - 200 Events", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/public/" + partner_a._id + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Post & Events (/community)", () => {
    it("1. should NOT read posts & events - 401 Unauthorized", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("community/private/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should read posts & events - 200 PostsEvents", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("community/public/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should read partner's posts & events - 200 PostsEvents", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("community/public/" + partner_a._id + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Microcredit Campaigns (/microcredit/campaigns)", () => {
    it("1. should read microcredit campaigns - 200 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/campaigns/public/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read partner's microcredit campaigns - 200 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/campaigns/public/" + partner_a._id + "/" + '0-0-0')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should read campaign - 200 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/campaigns/" + partner_a._id + "/" + microcredit_a._id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("One Click Register - Support (/auth || /microcredit)", () => {
    it("1. should register a user only email - 200 OneClickAction", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/one-click/register")
        .send({
          email: user_f.email
        }).end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          user_f.oneClickToken = res.body.data.oneClickToken;
          user_f.tempPass = res.body.tempData.password;
          done();
        });
    });
    it("2. should promise fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/one-click/" + partner_a._id + "/" + microcredit_a._id + "/" + user_f.oneClickToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 20,
        }).end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should get onClickToken - 200 OneClickAction", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/one-click/register")
        .send({
          email: user_f.email
        }).end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          user_f.oneClickToken = res.body.data.oneClickToken;
          done();
        });
    });
    it("4. should promise/receive (paypal) fund - 200 Payment", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/one-click/" + partner_a._id + "/" + microcredit_a._id + "/" + user_f.oneClickToken)
        .send({
          method: 'PIRBGRAA',
          _amount: 20,
          paid: true
        }).end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
});
