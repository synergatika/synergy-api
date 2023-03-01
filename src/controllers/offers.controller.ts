import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';
import { Parser } from 'json2csv';

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
import { User, LoyaltyOffer, LoyaltyStatistics, Partner, LoyaltyTransactionType, LoyaltyTransaction, Member, ExportedLoyaltyStatistics } from '../_interfaces/index';

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
// const uploadFile = FilesMiddleware.uploadFile;
const uploadFile = FilesMiddleware.uploadFile;
// const existFile = FilesMiddleware.existsFile;
// const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.offerSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import offerModel from '../models/offer.model';
import transactionModel from '../models/loyalty.transaction.model';

/**
 * Files Util
 */
import FilesUtil from '../utils/files.util';
const filesUtil = new FilesUtil();

/**
 * Transactions Util
 */
import LoyaltyTransactionUtil from '../utils/loyalty.transactions';
const transactionsUtil = new LoyaltyTransactionUtil();

class OffersController implements Controller {
  public path = '/loyalty/offers';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`,
      this.readOffers);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile('static', 'loyalty').single('imageURL'),
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
      uploadFile('static', 'loyalty').single('imageURL'),
      validationBodyAndFileMiddleware(OfferDto),
      itemsMiddleware.offerMiddleware,
      this.updateOffer);

    this.router.delete(`${this.path}/:partner_id/:offer_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(OfferID),
      accessMiddleware.belongsTo,
      itemsMiddleware.offerMiddleware,
      this.deleteOffer);


    this.router.get(`${this.path}/:partner_id/:offer_id/statistics/:date`,
      validationParamsMiddleware(OfferID),
      itemsMiddleware.offerMiddleware,
      this.readOfferStatistics);

    this.router.get(`${this.path}/:partner_id/:offer_id/statistics/:date/export`,
      validationParamsMiddleware(OfferID),
      itemsMiddleware.offerMiddleware,
      this.exportStatistics);
  }

  /** 
   * 
   * Secondary Functions 
   * 
   */

  private dateConvert = (x: string | number | Date) => {
    var today = new Date(x);
    var year = today.getFullYear();
    var month = `0${today.getMonth() + 1}`.slice(-2);
    var day = `0${today.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }

  private checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }


  /**
   * 
   * Main Functions (Route: `/loyalty/offers`)
   * 
   */

  private readOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);
    /** ***** * ***** */

    let error: Error, offers: LoyaltyOffer[];
    [error, offers] = await to(offerModel.find({
      "$and": [
        { "expiresAt": { "$gt": offset.greater } },
        { "published": true }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: offers.filter(o => (o['partner'] as Partner).activated),
      code: 200
    });
  }

  private createOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: OfferDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(offerModel.create({
      ...data,
      "partner": user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "expiresAt": convertHelper.roundDate(data.expiresAt, 23)
    }).catch());
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
    [_error, _user] = await to(userModel.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, offers: LoyaltyOffer[];
    [error, offers] = await to(offerModel.find({
      "$and": [
        { "partner": _user },
        { "expiresAt": { $gt: offset.greater } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .lean()
      .sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  private readOffer = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    /** Params & Filters */
    // const partner_filter = this.checkObjectIdValidity(partner_id) ? { "_id": new ObjectId(partner_id) } : { "slug": partner_id };
    const offer_filter = this.checkObjectIdValidity(offer_id) ? { "_id": new ObjectId(offer_id) } : { "slug": offer_id };

    /** ***** * ***** */
    let error: Error, offer: LoyaltyOffer;
    [error, offer] = await to(offerModel.findOne(
      offer_filter
    )
      .populate([{
        "path": 'partner'
      }])
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: { ...offer },
      code: 200
    });
  }

  private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;
    const data: OfferDto = request.body;

    const currentOffer: LoyaltyOffer = response.locals.offer;
    if ((currentOffer["imageURL"] && (currentOffer["imageURL"]).includes('assets/static/')) && request.file) {
      await filesUtil.removeFile(currentOffer);
    }

    let error: Error, offer: LoyaltyOffer; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, offer] = await to(offerModel.findOneAndUpdate({
      "_id": offer_id
    }, {
      "$set": {
        ...data,
        "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentOffer['imageURL'],
        "slug": await createSlug(request),
        "expiresAt": convertHelper.roundDate(data.expiresAt, 23)
      }
    }, {
      "new": true
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

    const currentOffer: LoyaltyOffer = response.locals.offer;
    if ((currentOffer["imageURL"]) && (currentOffer["imageURL"]).includes('assets/static/')) {
      await filesUtil.removeFile(currentOffer);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(offerModel.findOneAndDelete({ "_id": new ObjectId(offer_id) }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been deleted!",
      code: 200
    });
  }

  private readOfferStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const offer: LoyaltyOffer = response.locals.offer;
    const date = request.params['date'];
    const { page, size } = request.query;

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(transactionsUtil.readOfferTransactions(offer, date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const redeem = transactions;

    let result: LoyaltyStatistics = {
      redeem: {
        points: redeem.reduce((accumulator, object) => {
          return accumulator + object.points;
        }, 0),
        quantity: redeem.reduce((accumulator, object) => {
          return accumulator + object.quantity;
        }, 0),
        uniqueUsers: [...new Set(redeem.map(item => (item.member as Member)?.email || (item.member as Member)?.card))],
        uniqueTransactions: [...new Set(redeem.map(item => (item.tx || item._id)))]
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    response.status(200).send({
      data: result,
      code: 200
    });
  }

  private exportStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const offer: LoyaltyOffer = response.locals.offer;
    const date = request.params['date'];
    const { page, size } = request.query;

    let error: Error, transactions: LoyaltyTransaction[];
    [error, transactions] = await to(transactionsUtil.readOfferTransactions(offer, date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const total = transactions;

    let result: LoyaltyStatistics = {
      total: {
        points: total.reduce((accumulator, object) => {
          return accumulator + object.points;
        }, 0),
        quantity: total.reduce((accumulator, object) => {
          return accumulator + object.quantity;
        }, 0),
        uniqueUsers: [...new Set(total.map(item => (item.member as Member)?.email || (item.member as Member)?.card))],
        uniqueTransactions: [...new Set(total.map(item => (item.tx || item._id)))]
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    const opts = {
      fields: ['date', 'quantity', 'users', 'transactions']
    };

    const json2csvParser = new Parser(opts);
    const csv = json2csvParser.parse([
      ...transactions.map(t => {
        return {
          date: t.createdAt,
          quantity: t.quantity,
          users: (t.member as Member).email || (t.member as Member).card,
          transactions: t.tx || t._id
        }
      }), {
        date: 'Total',
        quantity: result['total'].quantity,
        users: result['total'].uniqueUsers.length,
        transactions: result['total'].uniqueTransactions.length
      }] as ExportedLoyaltyStatistics[]);

    try {
      response.attachment(`Statistics-${offer.title}_${(date != '0' ? date : 'total')}.csv`);
      response.status(200).send(csv)
    } catch (error) {
      return next(new UnprocessableEntityException(`EXPORT ERROR || ${error}`));
    }
  }
}

export default OffersController;