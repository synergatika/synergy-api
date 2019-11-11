import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant, offers } from './_structs.test'


describe("Without Login", () => {
    describe("Merchants (/merchants)", () => {
        it("1. should read all merchants", (done) => {
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
        it("2. should read a merchant's info", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("merchants/" + defaultMerchant._id)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');
                    res.body.data.should.be.a('object');
                    done();
                });
        });
        it("3. should NOT read anything | as url does not exist", (done) => {
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
        it("1. should read all offers", (done) => {
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
        it("2. should read all merchant's offers", (done) => {
            chai.request(`${process.env.API_URL}`)
                .get("loyalty/offers/" + defaultMerchant._id)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
    });
});
