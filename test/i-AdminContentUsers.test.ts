import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import { defaultAdmin, content_a, content, user_a, user_b } from './_structs.test';

describe("Admin - Content & Users", () => {
  describe("Admin - Content (/content)", () => {
    it("1. should create content - 200 Created", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("content")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: content_a.name,
          el_title: content_a.el_title,
          en_title: content_a.en_title,
          el_content: content_a.el_content,
          en_content: content_a.en_content
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("2. should read content - 200 Content", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("content")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: content_a.name,
          el_title: content_a.el_title,
          en_title: content_a.en_title,
          el_content: content_a.el_content,
          en_content: content_a.en_content
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          let i = 0;
          for (i = 0; i < (res.body.data).length; i++) {
            content.push((res.body.data)[i]);
          }
          done();
        });
    });
    it("3. should NOT update content | el_content is missing - 400 Bad Request", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("content/" + content[content.length - 1]._id)
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: content_a.name,
          el_title: content_a.el_title,
          en_title: content_a.en_title,
          en_content: content_a.updated_en_content
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should update content - 200 Updated", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("content/" + content[content.length - 1]._id)
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .send({
          name: content_a.name,
          el_title: content_a.el_title,
          en_title: content_a.en_title,
          el_content: content_a.el_content,
          en_content: content_a.updated_en_content
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should read content by ID - 200 Content", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("content/" + content[content.length - 1]._id)
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
  });
  describe("Admin - Users (/users)", () => {
    it("1. should read partners - 200 Users", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("users/partner/0-0-0")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("2. should read members - 200 Users", (done) => {
      chai.request(`${process.env.API_URL}`)
        .get("users/member/0-0-0")
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          done();
        });
    });
    it("3. should NOT reactivate account | user is activated - 404 NotFound", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/activate/" + user_a._id)
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("4. should reactivate account - 200 Email Sent", (done) => {
      chai.request(`${process.env.API_URL}`)
        .put("auth/activate/" + user_b._id)
        .set('Authorization', 'Bearer ' + defaultAdmin.authToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('message');
          done();
        });
    });
    it("5. should authenticate user - 200 Authenticate", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("auth/authenticate")
        .send({
          email: user_b.email,
          password: user_b.password
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('data');
          res.body.data.should.be.a('object');
          res.body.data.should.have.property('user');
          res.body.data.should.have.property('token');
          user_b.authToken = res.body.data.token.token;
          done();
        });
    });
  });
});

