import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import { PartnerID, OfferID, OfferDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, LoyaltyOffer, LoyaltyStatistics, Partner, LoyaltyTransactionType } from '../_interfaces/index';

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
import offerModel from '../models/offer.model';
import transactionModel from '../models/loyalty.transaction.model';

class OffersController implements Controller {
  public path = '/loyalty/offers';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;
  private offerModel = offerModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`,
      this.readOffers);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.declareStaticPath, uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(OfferDto),
      this.createOffer);

    this.router.get(`${this.path}/public/:partner_id/:offset`,
      validationParamsMiddleware(PartnerID),
      this.readOffersByStore);

    this.router.get(`${this.path}/:partner_id/:offer_id`,
      validationParamsMiddleware(OfferID),
      this.readOffer);

    this.router.put(`${this.path}/:partner_id/:offer_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(OfferID),
      accessMiddleware.belongsTo,
      this.declareStaticPath, uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(OfferDto),
      itemsMiddleware.offerMiddleware,
      this.updateOffer);

    this.router.delete(`${this.path}/:partner_id/:offer_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(OfferID),
      accessMiddleware.belongsTo,
      itemsMiddleware.offerMiddleware,
      this.deleteOffer);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'loyalty';
    next();
  }

  private readOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);
    /** ***** * ***** */

    let error: Error, offers: LoyaltyOffer[];
    [error, offers] = await to(this.offerModel.find(
      // {
      // $and: [
      // { 'activated': true },
      { 'expiresAt': { $gt: offset.greater } }
      // ]
      // }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    // [error, offers] = await to(this.user.aggregate([{
    //   $unwind: '$offers'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'activated': true },
    // { 'offers.expiresAt': { $gt: offset.greater } } // (offset[2] === 1) ? seconds : 0
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectOffer()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
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
    [error, results] = await to(this.offerModel.create({
      ...data,
      partner: user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "expiresAt": convertHelper.roundDate(data.expiresAt, 23)
    }).catch());
    // [error, results] = await to(this.user.updateOne({
    //   _id: user._id
    // }, {
    //   $push: {
    //     offers: {
    //       "imageURL": `${process.env.API_URL}assets/static/${request.file.filename}`,
    //       "title": data.title,
    //       "subtitle": data.subtitle,
    //       "slug": await createSlug(request),
    //       "description": data.description,
    //       "instructions": data.instructions,
    //       "cost": data.cost,
    //       "expiresAt": convertHelper.roundDate(data.expiresAt, 23)
    //     }
    //   }
    // }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(201).send({
      message: "Success! A new offer has been created!",
      code: 201
    });
  }

  private readOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };

    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(this.user.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, offers: LoyaltyOffer[];
    [error, offers] = await to(this.offerModel.find(
      {
        $and: [
          { 'partner': _user },
          { 'expiresAt': { $gt: offset.greater } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .lean()
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    // [error, offers] = await to(this.user.aggregate([{
    //   $unwind: '$offers'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       { 'offers.expiresAt': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectOffer()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  private readOffer = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    /** Params & Filters */
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    // const offer_filter = this.checkObjectIdValidity(offer_id) ? { '_id': (offer_id) } : { 'slug': offer_id };
    // const offer_filter = this.checkObjectIdValidity(offer_id) ? { '_id': new ObjectId(offer_id) } : { 'slug': offer_id };
    const offer_filter = ObjectId.isValid(offer_id) ? { _id: new ObjectId(offer_id) } : { slug: offer_id };

    /** ***** * ***** */
    let error: Error, offers: LoyaltyOffer[];
    [error, offers] = await to(this.offerModel.find(
      offer_filter
    )
      .populate([{
        path: 'partner'
      }])
      .lean()
      .catch());
    // [error, offers] = await to(this.user.aggregate([{
    //   $unwind: '$offers'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       offer_filter
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectOffer()
    //   }
    // }
    // ]).exec().catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!offers.length) {
      return next(new NotFoundException('OFFER_NOT_EXISTS'));
    }

    var x = await this.readStatistics2(offers, LoyaltyTransactionType.RedeemPointsOffer);
    console.log("Read Offer - New Statistics");
    console.log(x);

    const statisticsRedeem: LoyaltyStatistics[] = await this.readStatistics(offers, LoyaltyTransactionType.RedeemPointsOffer);
    const offerStatistics = offers.map((a: LoyaltyOffer) =>
      Object.assign({}, a,
        {
          statistics: (statisticsRedeem).find((b: LoyaltyStatistics) => (b._id).toString() === (a._id).toString()),
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

    const currentOffer: LoyaltyOffer = response.locals.offer;
    if ((currentOffer['imageURL'] && (currentOffer['imageURL']).includes('assets/static/')) && request.file) {
      await this.removeFile(currentOffer);
    }

    // const currentOffer: Offer = response.locals.offer;
    // if ((currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) && request.file) {
    //   //if (currentOffer.offer_imageURL && request.file) {
    //   var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, offer: LoyaltyOffer; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, offer] = await to(this.offerModel.findOneAndUpdate({
      _id: offer_id
    }, {
      $set: {
        ...data,
        imageURL: (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentOffer['imageURL'],
        'slug': await createSlug(request),
        'expiresAt': convertHelper.roundDate(data.expiresAt, 23)
      }
    }, {
      "new": true
    }).catch());
    // [error, results] = await to(this.user.updateOne(
    //   {
    //     _id: partner_id,
    //     'offers._id': offer_id
    //   }, {
    //   '$set': {
    //     'offers.$._id': offer_id,
    //     'offers.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentOffer['imageURL'],
    //     'offers.$.title': data.title,
    //     'offers.$.slug': await createSlug(request),
    //     'offers.$.subtitle': data.subtitle,
    //     'offers.$.description': data.description,
    //     'offers.$.instructions': data.instructions,
    //     'offers.$.cost': data.cost,
    //     'offers.$.expiresAt': convertHelper.roundDate(data.expiresAt, 23)
    //   }
    // }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been updated!",
      code: 200
    });
  }

  private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    const currentOffer: LoyaltyOffer = response.locals.offer;
    if ((currentOffer['imageURL']) && (currentOffer['imageURL']).includes('assets/static/')) {
      await this.removeFile(currentOffer);
    }
    // const currentOffer: Offer = response.locals.offer;
    // if (currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) {
    //   var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
    //   await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    // }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.offerModel.findOneAndDelete({ _id: new ObjectId(offer_id) }).catch());

    // [error, results] = await to(this.user.updateOne({
    //   _id: partner_id
    // }, {
    //   $pull: {
    //     offers: {
    //       _id: offer_id
    //     }
    //   }
    // }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been deleted!",
      code: 200
    });
  }

  /** Remove File (Local Function) */
  private async removeFile(currentOffer: LoyaltyOffer) {
    var imageFile = (currentOffer['imageURL']).split('assets/static/');
    const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
    if (existFile(file)) await deleteFile(file);
  }




  dateConvert = (x: string | number | Date) => {
    var today = new Date(x);
    var year = today.getFullYear();
    var month = `0${today.getMonth() + 1}`.slice(0, 2);
    var day = `0${today.getDate()}`.slice(0, 2);
    return `${year}-${month}-${day}`;
  }

  private readStatistics2 = async (offers: LoyaltyOffer[], status: string) => {
    // let error: Error, statistics: any[];
    // [error, statistics] = await to(this.transaction.find({
    //   'offer': { $in: offers.map(a => a._id) }
    // }).populate([
    //   { path: 'member' },
    //   { path: 'offer' }
    // ]).catch());

    console.log(offers.map(a => a._id));
    let error: Error, statistics: any[];
    [error, statistics] = await to(this.transaction.find({
      "$and": [
        { 'offer': { "$in": offers.map(a => a._id) } },
        { 'type': { "$in": [LoyaltyTransactionType.RedeemPointsOffer] } }
      ]
    }).populate([
      { path: 'member' },
      { path: 'offer' }
    ]).catch());


    console.log(statistics);

    var _total: { redeem: { points: number, quantity: number }, uniqueUsers: string[], uniqueTransactions: string[] }
      = { redeem: { points: 0, quantity: 0 }, uniqueUsers: [], uniqueTransactions: [] };
    var _daily: { redeem: { points: number, quantity: number }, uniqueUsers: string[], uniqueTransactions: string[], createdAt: string }[]
      = [];
    // var result_: { points: number, quantity: number, uniqueUsers: string[], uniqueTransactions: string[] } = { points: 0, quantity: 0, uniqueUsers: [], uniqueTransactions: [] };
    // statistics.map(o => { return { ...o, points: o.points, quantity: o.quantity, createdAt: this.dateConvert(o.createdAt) } }).forEach(element => {
    //   result_.points += element.points;
    //   result_.quantity += element.quantity;
    // });
    // result_.uniqueUsers = [...new Set(statistics.map(item => item.member._id))];
    // result_.uniqueTransactions = [...new Set(statistics.map(item => item._id))];

    // console.log(result_)

    // var result: { createdAt: string, points: number, quantity: number, uniqueUsers: string[], uniqueTransactions: string[] }[] = [];
    statistics.map(o => { return { ...o, points: o.points, quantity: o.quantity, member: o.member._id, transaction: o._id, createdAt: this.dateConvert(o.createdAt) } }).forEach(element => {
      /** Total */

      if (_total.uniqueUsers.findIndex(i => i === element.member) < 0) {
        _total.uniqueUsers.push(element.member);
      }

      if (_total.uniqueTransactions.findIndex(i => i === element.transaction) < 0) {
        _total.uniqueTransactions.push(element.transaction);
      }

      _total.redeem.points += element.points;
      _total.redeem.quantity += element.quantity;

      /** Daily */
      if (_daily.findIndex(i => i.createdAt === element.createdAt) < 0)
        _daily.push({ createdAt: element.createdAt, redeem: { points: 0, quantity: 0 }, uniqueUsers: [], uniqueTransactions: [] })

      if (_daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.findIndex(i => i === element.member) < 0) {
        _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueUsers.push(element.member);
      }

      if (_daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.findIndex(i => i === element.transaction) < 0) {
        _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].uniqueTransactions.push(element.transaction);
      }

      _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].redeem.points += element.points;
      _daily[_daily.findIndex(i => i.createdAt === element.createdAt)].redeem.quantity += element.quantity;
    });

    return { _total, _daily }
  }

  private readStatistics = async (offers: LoyaltyOffer[], status: string) => {
    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'offer_id': { $in: offers.map(a => (a._id).toString()) } },
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

  private readDailyStatistics = async (offers: LoyaltyOffer[], status: string) => {

    let error: Error, statistics: LoyaltyStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'offer_id': { $in: offers.map(a => (a._id).toString()) } },
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


/**
 *
 * Local Function Section
 *
 * */

  // /** Project Partner (Local Function) */
  // private projectPartner() {
  //   return {
  //     _id: '$_id',
  //     name: '$name',
  //     email: '$email',
  //     slug: '$slug',
  //     imageURL: '$imageURL',
  //     payments: '$payments',
  //     address: '$address',
  //     contacts: '$contacts',
  //     phone: '$phone',
  //   };
  // }

  // /** Project Offer (Local Function) */
  // private projectOffer() {
  //   return {
  //     _id: '$offers._id',
  //     slug: '$offers.slug',
  //     imageURL: '$offers.imageURL',
  //     title: '$offers.title',
  //     subtitle: '$offers.subtitle',
  //     cost: '$offers.cost',
  //     description: '$offers.description',
  //     instructions: '$offers.instructions',
  //     expiresAt: '$offers.expiresAt',
  //   };
  // }