import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { defaultMerchant, newMerchant, offers } from './_structs.test'

describe("Merchant", () => {
    describe("Offers (/loyalty/offers)", () => {
        it("4. should update an offer", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("loyalty/offers/" + defaultMerchant._id + "/" + offers[0].offer_id)
                .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                .send({
                    description: '5 + 2 Beers',
                    cost: 5000,
                    expiresAt: '2020-10-22'
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("5. should NOT update offer | as it does not belong to logged in user", (done) => {
            chai.request(`${process.env.API_URL}`)
                .put("loyalty/offers/" + defaultMerchant._id + "/" + offers[0].offer_id)
                .set('Authorization', 'Bearer ' + newMerchant.authToken)
                .send({
                    description: 'Free meals at Mondays',
                    cost: 3000,
                    expiresAt: '2019-11-22'
                })
                .end((err, res) => {
                    res.should.have.status(403);
                    res.body.should.be.a('object');
                    done();
                });
        });
        it("6. should delete an offer", (done) => {
            chai.request(`${process.env.API_URL}`)
                .delete("loyalty/offers/" + defaultMerchant._id + "/" + offers[1].offer_id)
                .set('Authorization', 'Bearer ' + defaultMerchant.authToken)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                });
        });
    });
});