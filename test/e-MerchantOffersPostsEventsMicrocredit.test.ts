import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import * as fs from 'fs';

import { imagesLocation, partner_a, user_a, offer_a, offer_b, post_a, post_b, event_a, event_b, microcredit_a, microcredit_b, offers, events } from './_structs.test';

describe("Partner - Offers, Posts, Events", () => {
  describe("Partner - Offers (/loyalty/offers)", () => {
    var _date = new Date();
    var _newDate = _date.setDate(_date.getDate() + 60);

    var _date2 = new Date();
    var _newDate2 = _date2.setDate(_date.getDate() + 75);

    it("1. should create an offer - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', offer_a.title)
        .field('subtitle', offer_a.subtitle)
        .field('description', offer_a.description)
        .field('cost', offer_a.cost)
        .field('expiresAt', _newDate.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${offer_a.imageFile}`),
        `${offer_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should read partner's offers - 200 Offers", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/public/" + partner_a._id + "/" + '0-0-0')
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');

          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            offers.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("3. should create offer | even if subtitle is missing - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', offer_b.title)
        .field('description', offer_b.description)
        .field('cost', offer_b.cost)
        .field('expiresAt', _newDate.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${offer_b.imageFile}`),
        `${offer_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should read offer - 200 Offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("loyalty/offers/" + partner_a._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("5. should update a offer - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("loyalty/offers/" + partner_a._id + "/" + offers[0].offer_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', offer_a.title)
        .field('subtitle', offer_a.subtitle)
        .field('description', offer_a.description)
        .field('cost', offer_a.cost)
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${offer_a.updatedImageFile}`),
        `${offer_a.updatedImageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
  });

  describe("Partner - Posts (/posts)", () => {
    it("1. should NOT create a post | user is not partner - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + user_a.authToken)
        .field('title', post_a.title)
        .field('subtitle', post_a.subtitle)
        .field('content', post_a.content)
        .field('access', post_a.access)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${post_a.imageFile}`),
        `${post_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should NOT create a post | content is missing - 400 Bad Request", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', post_a.title)
        .field('subtitle', post_a.subtitle)
        .field('access', post_a.access)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${post_a.imageFile}`),
        `${post_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should create a post - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', post_a.title)
        .field('subtitle', post_a.subtitle)
        .field('content', post_a.content)
        .field('access', post_a.access)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${post_a.imageFile}`),
        `${post_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should NOT create a post | partner is unauthorized - 401 Unauthorized", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + 'random_token')
        .field('title', post_b.title)
        .field('content', post_b.content)
        .field('access', post_b.access)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${post_b.imageFile}`),
        `${post_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should create a post | even if subtitle is missing - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("posts/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', post_b.title)
        .field('content', post_b.content)
        .field('access', post_b.access)
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${post_b.imageFile}`),
        `${post_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
  });
  describe("Partner - Events (/events)", () => {
    var _date = new Date();
    var _newDate = _date.setDate(_date.getDate() + 20);

    var _date2 = new Date();
    var _newDate2 = _date2.setDate(_date.getDate() + 35);

    it("1. should create an event - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_a.title)
        .field('subtitle', event_a.subtitle)
        .field('description', event_a.description)
        .field('access', event_a.access)
        .field('location', event_a.location)
        .field('dateTime', _newDate.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_a.imageFile}`),
        `${event_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should NOT create an event | as description is missing - 400 Bad Request", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_a.title)
        .field('subtitle', event_a.subtitle)
        .field('access', event_a.access)
        .field('location', event_a.location)
        .field('dateTime', _newDate.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_a.imageFile}`),
        `${event_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("3. should create an event | even if subtitle is missing - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_b.title)
        .field('description', event_b.description)
        .field('access', event_b.access)
        .field('location', event_b.location)
        .field('dateTime', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_b.imageFile}`),
        `${event_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should read events - 200 Events", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/private/" + partner_a._id + "/0-0-0")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            events.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("5. should ΝΟΤ delete event | not belongs to - 403 Forbidden", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("events/" + '5e6a7f6f6e9b481292dcb376' + "/" + events[0].event_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          done();
        });
    });
    it("6. should NOT update event | not exists - 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("events/" + partner_a._id + "/" + '5e6a7f6f6e9b481292dcb376')
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_b.title)
        .field('subtitle', event_b.subtitle)
        .field('description', event_b.description)
        .field('access', event_b.access)
        .field('location', event_b.location)
        .field('dateTime', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_b.updatedImageFile}`),
        `${event_b.updatedImageFile}`)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("7. should update event - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("events/" + partner_a._id + "/" + events[0].event_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_b.title)
        .field('subtitle', event_b.subtitle)
        .field('description', event_b.description)
        .field('access', event_b.access)
        .field('location', event_b.location)
        .field('dateTime', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_b.updatedImageFile}`),
        `${event_b.updatedImageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("8. should delete event - 200 Deleted", (done) => {
      chai.request(`${process.env.API_URL}`)
        .delete("events/" + partner_a._id + "/" + events[0].event_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("9. should create an event | even if image is missing - 201 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', event_b.title)
        .field('suntitle', event_b.title)
        .field('description', event_b.description)
        .field('access', event_b.access)
        .field('location', event_b.location)
        .field('dateTime', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${event_b.updatedImageFile}`),
        `${event_b.updatedImageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("10. should read an event - 200 Event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("events/" + partner_a._id + "/" + events[1].event_id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Partner - Microcredit Campaigns", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() - 10);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 50);
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 50);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 200);

    it("1. should create campaign | 201 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', microcredit_a.title)
        .field('terms', microcredit_a.terms)
        .field('access', microcredit_a.access)
        .field('description', microcredit_a.description)
        .field('category', microcredit_a.category)
        .field('subtitle', microcredit_a.subtitle)
        .field('quantitative', microcredit_a.quantitative)
        .field('stepAmount', microcredit_a.stepAmount)
        .field('minAllowed', microcredit_a.minAllowed)
        .field('maxAllowed', microcredit_a.maxAllowed)
        .field('maxAmount', microcredit_a.maxAmount)
        .field('redeemStarts', _newDate1.toString())
        .field('redeemEnds', _newDate4.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${microcredit_a.imageFile}`),
        `${microcredit_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          microcredit_a._id = res.body.data._id;
          done();
        });
    });
    it("2. should read campaign | 200 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("microcredit/campaigns/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should update campaign | 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/campaigns/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', microcredit_a.title)
        .field('terms', microcredit_a.terms)
        .field('access', microcredit_a.access)
        .field('description', microcredit_a.updatedDescription)
        .field('category', microcredit_a.category)
        .field('subtitle', microcredit_a.subtitle)
        .field('quantitative', microcredit_a.quantitative)
        .field('stepAmount', microcredit_a.stepAmount)
        .field('minAllowed', microcredit_a.minAllowed)
        .field('maxAllowed', microcredit_a.maxAllowed)
        .field('maxAmount', microcredit_a.maxAmount)
        .field('redeemStarts', _newDate1.toString())
        .field('redeemEnds', _newDate4.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${microcredit_a.imageFile}`),
        `${microcredit_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should publish campaign | 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/campaigns/" + partner_a._id + "/" + microcredit_a._id + "/publish")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should NOT updated | is published 404 Not Found", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/campaigns/" + partner_a._id + "/" + microcredit_a._id)
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', microcredit_a.title)
        .field('terms', microcredit_a.terms)
        .field('access', microcredit_a.access)
        .field('description', microcredit_a.updatedDescription)
        .field('category', microcredit_a.category)
        .field('subtitle', microcredit_a.subtitle)
        .field('quantitative', microcredit_a.quantitative)
        .field('stepAmount', microcredit_a.stepAmount)
        .field('minAllowed', microcredit_a.minAllowed)
        .field('maxAllowed', microcredit_a.maxAllowed)
        .field('maxAmount', microcredit_a.maxAmount)
        .field('redeemStarts', _newDate1.toString())
        .field('redeemEnds', _newDate4.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${microcredit_a.imageFile}`),
        `${microcredit_a.imageFile}`)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });

    it("6. should NOT create campaign | description is missing 400 Bad Request", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', microcredit_b.title)
        .field('terms', microcredit_b.terms)
        .field('access', microcredit_b.access)
        .field('category', microcredit_b.category)
        .field('subtitle', microcredit_b.subtitle)
        .field('quantitative', microcredit_b.quantitative)
        .field('stepAmount', microcredit_b.stepAmount)
        .field('minAllowed', microcredit_b.minAllowed)
        .field('maxAllowed', microcredit_b.maxAllowed)
        .field('maxAmount', microcredit_b.maxAmount)
        .field('redeemStarts', _newDate1.toString())
        .field('redeemEnds', _newDate2.toString())
        .field('startsAt', _newDate3.toString())
        .field('expiresAt', _newDate4.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${microcredit_b.imageFile}`),
        `${microcredit_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("7. should create campaign | 201 Campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .field('title', microcredit_b.title)
        .field('terms', microcredit_b.terms)
        .field('access', microcredit_b.access)
        .field('description', microcredit_b.description)
        .field('category', microcredit_b.category)
        .field('subtitle', microcredit_b.subtitle)
        .field('quantitative', microcredit_b.quantitative)
        .field('stepAmount', microcredit_b.stepAmount)
        .field('minAllowed', microcredit_b.minAllowed)
        .field('maxAllowed', microcredit_b.maxAllowed)
        .field('maxAmount', microcredit_b.maxAmount)
        .field('redeemStarts', _newDate3.toString())
        .field('redeemEnds', _newDate4.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}/${microcredit_b.imageFile}`),
        `${microcredit_b.imageFile}`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          microcredit_b._id = res.body.data._id;
          done();
        });
    });
    it("8. should publish campaign | 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("microcredit/campaigns/" + partner_a._id + "/" + microcredit_b._id + "/publish")
        .set('Authorization', 'Bearer ' + partner_a.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
  });
});
