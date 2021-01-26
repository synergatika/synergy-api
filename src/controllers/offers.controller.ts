import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import OfferDto from '../loyaltyDtos/offer.dto'
import PartnerID from '../usersDtos/partner_id.params.dto'
import OfferID from '../loyaltyDtos/offer_id.params.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
import LoyaltyStatistics from '../loyaltyInterfaces/loyaltyStatistics.interface';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import convertHelper from '../middleware/items/convert.helper';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.offerSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/loyalty.transaction.model';

class OffersController implements Controller {
  public path = '/loyalty/offers';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readAllOffers);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), this.createOffer);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readOffersByStore);
    this.router.get(`${this.path}/:partner_id/:offer_id`, validationParamsMiddleware(OfferID), this.readOffer);
    this.router.put(`${this.path}/:partner_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), itemsMiddleware.offerMiddleware, this.updateOffer);
    this.router.delete(`${this.path}/:partner_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, itemsMiddleware.offerMiddleware, this.deleteOffer);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'loyalty';
    next();
  }

  private readAllOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        $and: [
          { 'activated': true },
          { 'offers.expiresAt': { $gt: offset.greater } } // (offset[2] === 1) ? seconds : 0
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contacts: '$contacts',
        partner_phone: '$phone',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        description: '$offers.description',
        instructions: '$offers.instructions',
        cost: '$offers.cost',
        expiresAt: '$offers.expiresAt',

        createdAt: '$offers.createdAt',
        updatedAt: '$offers.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  private createOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: OfferDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: user._id
    }, {
        $push: {
          offers: {
            "imageURL": `${process.env.API_URL}assets/static/${request.file.filename}`,
            "title": data.title,
            "subtitle": data.subtitle,
            "slug": await createSlug(request),
            "description": data.description,
            "instructions": data.instructions,
            "cost": data.cost,
            "expiresAt": convertHelper.roundDate(data.expiresAt, 23)
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(201).send({
      message: "Success! A new offer has been created!",
      code: 201
    });
  }

  private readOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'offers.expiresAt': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'offers.expiresAt': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contacts: '$contacts',
        partner_phone: '$phone',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        cost: '$offers.cost',
        description: '$offers.description',
        instructions: '$offers.instructions',
        expiresAt: '$offers.expiresAt',

        createdAt: '$offers.createdAt',
        updatedAt: '$offers.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  private readOffer = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'offers._id': ObjectId.isValid(offer_id) ? new ObjectId(offer_id) : new ObjectId() }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'offers.slug': offer_id }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contacts: '$contacts',
        partner_phone: '$phone',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        cost: '$offers.cost',
        description: '$offers.description',
        instructions: '$offers.instructions',
        expiresAt: '$offers.expiresAt',

        createdAt: '$offers.createdAt'
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!offers.length) {
      return next(new NotFoundException('OFFER_NOT_EXISTS'));
    }

    const statisticsRedeem: LoyaltyStatistics[] = await this.readStatistics(offers, 'RedeemPointsOffer');
    const offerStatistics = offers.map((a: Offer) =>
      Object.assign({}, a,
        {
          statistics: (statisticsRedeem).find((b: LoyaltyStatistics) => (b._id).toString() === (a.offer_id).toString()),
        }
      )
    );

    response.status(200).send({
      data: offerStatistics[0],
      code: 200
    });
  }

  private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;
    const data: OfferDto = request.body;


    const currentOffer: Offer = response.locals.offer;
    if (currentOffer['offer_imageURL'] && request.file) {
      var imageFile = (currentOffer['offer_imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }

    // const currentOffer: Offer = response.locals.offer;
    // if ((currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) && request.file) {
    //   //if (currentOffer.offer_imageURL && request.file) {
    //   var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'offers._id': offer_id
      }, {
        '$set': {
          'offers.$._id': offer_id,
          'offers.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentOffer.offer_imageURL,
          'offers.$.title': data.title,
          'offers.$.slug': await createSlug(request),
          'offers.$.subtitle': data.subtitle,
          'offers.$.description': data.description,
          'offers.$.instructions': data.instructions,
          'offers.$.cost': data.cost,
          'offers.$.expiresAt': convertHelper.roundDate(data.expiresAt, 23)
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been updated!",
      code: 200
    });
  }

  private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    const currentOffer: Offer = response.locals.offer;
    if (currentOffer['offer_imageURL']) {
      var imageFile = (currentOffer['offer_imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }
    // const currentOffer: Offer = response.locals.offer;
    // if (currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) {
    //   var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: partner_id
    }, {
        $pull: {
          offers: {
            _id: offer_id
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been deleted!",
      code: 200
    });
  }

  private readStatistics = async (offers: Offer[], status: string) => {

    // var _now: number = Date.now();
    // var _date = new Date(_now);
    // _date.setDate(1);
    // _date.setHours(0, 0, 0, 0);
    // _date.setMonth(_date.getMonth() - 12);

    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'offer_id': { $in: offers.map(a => (a.offer_id).toString()) } },
          { 'type': status }
          //{ 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        ]
      }
    },
    {
      $group: {
        _id: '$offer_id',
        points: { $sum: "$points" },
        quantity: { $sum: "$quantity" },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      "$project": {
        "points": 1,
        "quantity": 1,
        "users": { "$size": "$users" },
        "usersArray": '$users',
        "count": { "$size": "$count" }
      }
    }
    ]).exec().catch());
    if (error) return [];

    const byDate: LoyaltyStatistics[] = await this.readDailyStatistics(offers, status);
    const fullStatistics = statistics.map((a: LoyaltyStatistics) =>
      Object.assign({}, a,
        {
          byDate: ((byDate).find((e: LoyaltyStatistics) => (e._id).toString() === (a._id).toString())).byDate,
        }
      )
    );

    return fullStatistics;
  }

  private readDailyStatistics = async (offers: Offer[], status: string) => {

    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'offer_id': { $in: offers.map(a => (a.offer_id).toString()) } },
          { 'type': status }
        ]
      }
    },
    {
      $group: {
        _id: {
          offer_id: "$offer_id",
          date: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
        },
        points: { $sum: "$points" },
        quantity: { $sum: "$quantity" },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      $group: {
        _id: "$_id.offer_id",
        byDate: {
          $push: {
            date: "$_id.date", points: '$points', quantity: "$quantity", users: { "$size": "$users" }, usersArray: '$users', count: { "$size": "$count" }
          }
        }
      }
    },
    {
      "$project": {
        "byDate": { date: 1, points: 1, quantity: 1, users: 1, usersArray: 1, count: 1 },
      }
    }
    ]).exec().catch());
    if (error) return [];

    statistics.forEach((element: any) => {
      element.byDate.forEach((element: any) => {
        element.date = (element.date.year).toString() + "/" + ("0" + (element.date.month).toString()).slice(-2) + "/" + ("0" + (element.date.day).toString()).slice(-2);
      });
    });

    return statistics;
  }
}

export default OffersController;
