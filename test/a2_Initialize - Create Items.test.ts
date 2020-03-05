import * as chai from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

import 'dotenv/config';
import validateEnv from '../src/utils/validateEnv';
validateEnv();

import { imagesLocation, defaultAdmin, defaultMerchant_1, defaultMerchant_2, defaultMerchant_3 } from './_structs.test';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
var path = require('path');
// Image Upload & Remove
const fs = require('fs')
// const { promisify } = require('util')
// const unlinkAsync = promisify(fs.unlink);
var rimraf = require("rimraf");
// Eth
import { BlockchainService } from '../src/utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);


describe("Create Offers", () => {
  describe("by Bread & Roses (defaultMerchant_4)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 30);
    it("1.1 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_4.authToken)
        .field('title', 'Stand Up Roses: Free Entrance')
        .field('subtitle', 'Enjoy the new Stand Up show of Dimitris Christoforidis on the rooftop of Bread and Roses!')
        .field('description', 'On Saturday 7th of March at 9pm, our beloved Dimitris Christoforidis climbs on the rooftop of Bread and Roses to present Lower with C and a lot of new material! <br> We are offering free entrance to our supporters!')
        .field('cost', 100)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}breadandroses_offer.jpg`),
          `breadandroses_offer.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("by Action Plus (defaultMerchant_6)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 45);
    it("1.2 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_6.authToken)
        .field('title', 'Get to know Acropolis')
        .field('subtitle', 'The necessary tour for every resident and visitor of Athens.')
        .field('description', 'The Sacred Rock of the Acropolis dominates our city and its magnificent monuments tell our story. Prepare for a journey through time and history along with ActionPlus\' excellent guides <br> We are offering a guided one-hour long tour on Sunday 8th of March at 11.00 am!')
        .field('cost', 200)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}actionplus_offer.jpg`),
          `actionplus_offer.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("by Cooperative Publications (defaultMerchant_5)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 7);
    it("1.3 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_5.authToken)
        .field('title', 'Let\'s make weekends about books')
        .field('subtitle', 'For every book you take, we give you another one for free.')
        .field('description', 'We want to make weekends all about books. We have created a list of our previous publications that we consider must-reads! <br> Visit our bookstore and get one of those for free for every new publication you buy!')
        .field('cost', 100)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}cooperativepublications_offer.jpg`),
          `cooperativepublications_offer.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("by Syn Allois (defaultMerchant_3)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 20);
    it("1.4 should create a new offer", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("loyalty/offers/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'BIOME Cleaning Products Discount')
        .field('subtitle', 'Limited number of products.')
        .field('description', 'We support the operation of the cooperative BIOME and make sure our cleaning products are ecological and reliable. To give you a chance to try, we offer a 20% discount on every transaction on cleaners!')
        .field('cost', 80)
        .field('expiresAt', _newDate1.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}synallois_offer.jpg`),
          `synallois_offer.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});

describe("Create Events", () => {
  describe("by Syn Allois (defaultMerchant_3)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 30);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 10);
    it("2.1 should create a new event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'CoOpenAir Festival 2020')
        .field('subtitle', 'The best way to say something is to do it')
        .field('description', 'Through cultural events, concerts, exhibitions, conversations and workshops, we highlight the living examples of cooperative undertakings that work and operate radically. <br> There we will sing together, we will discuss together, we will eat and drink and mostly we will co-envisage how these undertakings could comprise “the revolution of the daily life” for the people who are not satisfied by complaints and condemnation, but take their lives in their hands. <br> Claiming the collective and personal autonomy and its implementation in today’s life.')
        .field('access', 'public')
        .field('dateTime', _newDate2.toString())
        .field('location', 'Laetrou 21-25, Thessaloniki')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}synallois_event_public.jfif`),
          `synallois_event_public.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
    it("2.2 should create a new event", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("events/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'Organization Committe for CoOpenAir Festival 2020')
        .field('subtitle', 'Let\'s start to discuss and organize our Festival')
        .field('description', 'The CoOpen Air Festival has become a tradition for the cooperative community in Greece. <br> We are starting the organizational meetings in order to dicuss and generate ideas for this years edition. <br> Everyone that wants to join is more than welcomed')
        .field('access', 'partners')
        .field('dateTime', _newDate2.toString())
        .field('location', 'Nileos 35, SynAllois')
        .attach('imageURL', fs.readFileSync(`${imagesLocation}synallois_event_partners.jfif`),
          `synallois_event_partners.jfif`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});

describe("Create Microcredit Campaigns", () => {
  describe("by Cooperative Publications (defaultMerchant_5)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate() + 100);
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate() + 150);
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 200);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 400);

    it("3.1 should create a new microcredit campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + defaultMerchant_5.authToken)
        .field('title', 'Become Friends of Cooperative Publications!')
        .field('terms', 'With an annual subscription of 80 euros, in a single installment, our friends will get a free copy of every new book coming out this year. <br>In addition to the free copy, they will be able to purchase our books at a 50% discount on the (catalog price).')
        .field('access', 'public')
        .field('description', 'This is the year we start the initiative of Friends of Cooperative Publications. <br>This concept is not our originality. We know that many alternative publishing houses throughout Europe have established this institution. <br>Friends of the Publications will bea valuable support in our efforts both at the financial level and at the level of contributing with suggestions, advice, ideas and so on. They are at the same time an important aid in the movement of our books. <br>We expect Friends of Publications, in addition to their assistance in the issue of trafficking, to open up new ways for our books to become more prominent and reach new places (hangouts, bookshops, provincial towns, etc.). <br>Friends staying outside of Athens will receive their books whenever they wish, by post (by postage charge). <br>Anyone interested in joining the program is kindly requested to support us until the end of March 2020. <br>Thank you in advance for your valuable help and support. <br>Now that we have become friends, take a stroll through our bookstore at 30 Kalidromiou Street, Exarchia. We will be very happy to talk and drink a cup of coffee!')
        .field('category', 'Culture and Recreation')
        .field('subtitle', 'Get your books of the year NOW!')
        .field('quantitative', 'false')
        .field('stepAmount', '1')
        .field('minAllowed', '80')
        .field('maxAllowed', '80')
        .field('maxAmount', '0')
        .field('redeemStarts', _newDate2.toString())
        .field('redeemEnds', _newDate3.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}cooperativepublications_campaign.jpg`),
          `cooperativepublications_campaign.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
  describe("by Syn Allois (defaultMerchant_3)", () => {
    var _date_1 = new Date();
    var _newDate1 = _date_1.setDate(_date_1.getDate());
    var _date_2 = new Date();
    var _newDate2 = _date_2.setDate(_date_2.getDate());
    var _date_3 = new Date();
    var _newDate3 = _date_3.setDate(_date_3.getDate() + 50);
    var _date_4 = new Date();
    var _newDate4 = _date_4.setDate(_date_4.getDate() + 200);

    it("3.2 should create a new microcredit campaign", (done) => {
      chai.request(`${process.env.API_URL}`)
        .post("microcredit/campaigns/")
        .set('Authorization', 'Bearer ' + defaultMerchant_3.authToken)
        .field('title', 'In the Beginning There Was Coffee')
        .field('terms', 'Supporting our efforts will allow you to get equal amount of our fair trade coffee products on our stores. These products are 100% Arabica Coffee on beans (for business) and on powder for filter and espresso coffee.')
        .field('access', 'public')
        .field('description', 'From the coffee of the Zapatista communities in Chiapas, Mexico, about ten years ago, the first solidarity movements in Greece began to develop into ventures such as we at SynAllois. <br> From then, we are trying along with others initiatives throughout Europe, to import Zapatista coffee with fair and solidarity conditions. <br>A characteristic of fair trade products is that 60% of the order is prepaid to producers at harvest time so that they are not dependent on interest-bearing loans.<br> We are the sole distributer of Zapatista coffee in the country. Why is that important? <br> First, we buy directly from the producer. We are not speculating. Additionally, we are interested in how the product is produced - the ecological dimension and the working relationship. <br> Let\'s create better ways to enjoy coffee')
        .field('category', 'Food and Supplies')
        .field('subtitle', 'Help us bring Zapatista Coffee to Athens!')
        .field('quantitative', 'true')
        .field('stepAmount', '1')
        .field('minAllowed', '10')
        .field('maxAllowed', '100')
        .field('maxAmount', '30000')
        .field('redeemStarts', _newDate2.toString())
        .field('redeemEnds', _newDate3.toString())
        .field('startsAt', _newDate1.toString())
        .field('expiresAt', _newDate2.toString())
        .attach('imageURL', fs.readFileSync(`${imagesLocation}synallois_campaign.jpg`),
          `synallois_campaign.jpg`)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
