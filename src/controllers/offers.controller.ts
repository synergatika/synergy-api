import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var latinize = require('latinize');

// Dtos
import OfferDto from '../loyaltyDtos/offer.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'
import OfferID from '../loyaltyDtos/offer_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function(req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/items'));
  },
  filename: function(req: RequestWithUser, file, cb) {
    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

class OffersController implements Controller {
  public path = '/loyalty/offers';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readAllOffers);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, upload.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), this.createOffer);
    this.router.get(`${this.path}/public/:merchant_id/:offset`, validationParamsMiddleware(MerchantID), this.readOffersByStore);
    this.router.get(`${this.path}/:merchant_id/:offer_id`, validationParamsMiddleware(OfferID), this.readOffer);
    this.router.put(`${this.path}/:merchant_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), itemsMiddleware.offerMiddleware, this.updateOffer);
    this.router.delete(`${this.path}/:merchant_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, itemsMiddleware.offerMiddleware, this.deleteOffer);
  }

  private offsetParams = (params: string) => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0 };
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }

  private readAllOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        'offers.expiresAt': { $gt: offset.greater } // (offset[2] === 1) ? seconds : 0
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        address: '$address',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        description: '$offers.description',
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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  private latinize = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: OfferDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await this.user.aggregate([
      { $unwind: '$offers' },
      { $match: { $and: [{ slug: (user._id) }, { $or: [{ 'offers.slug': _slug }, { 'offers.slug': { $regex: _slug + "-.*" } }] }] } },
      { $project: { _id: '$_id', title: '$offers.title', slug: '$offers.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else return _slug + "-" + (slugs.length + 1);
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
            "imageURL": `${process.env.API_URL}assets/items/${request.file.filename}`,
            "title": data.title,
            "subtitle": data.subtitle,
            "slug": await this.latinize(request, response, next),
            "description": data.description,
            "cost": data.cost,
            "expiresAt": data.expiresAt
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! A new offer has been created!",
      code: 201
    });
  }

  private readOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'offers.expiresAt': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'offers.expiresAt': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        address: '$address',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        cost: '$offers.cost',
        description: '$offers.description',
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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: offers,
      code: 200
    });
  }

  private readOffer = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    let error: Error, offers: Offer[];
    [error, offers] = await to(this.user.aggregate([{
      $unwind: '$offers'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'offers._id': ObjectId.isValid(offer_id) ? new ObjectId(offer_id) : new ObjectId() }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'offers.slug': offer_id }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        address: '$address',

        offer_id: '$offers._id',
        offer_slug: '$offers.slug',
        offer_imageURL: '$offers.imageURL',
        title: '$offers.title',
        subtitle: '$offers.subtitle',
        cost: '$offers.cost',
        description: '$offers.description',
        expiresAt: '$offers.expiresAt',

        createdAt: '$offers.createdAt'
      }
    }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    console.log(offers);
    response.status(200).send({
      data: offers[0],
      code: 200
    });
  }

  private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;
    const data: OfferDto = request.body;

    const currentOffer: Offer = response.locals.offer;
    if ((currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(merchant_id)) && request.file) {
      //if (currentOffer.offer_imageURL && request.file) {
      var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: merchant_id,
        'offers._id': offer_id
      }, {
        '$set': {
          'offers.$._id': offer_id,
          'offers.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentOffer.offer_imageURL,
          'offers.$.title': data.title,
          'offers.$.subtitle': data.subtitle,
          'offers.$.description': data.description,
          'offers.$.cost': data.cost,
          'offers.$.expiresAt': data.expiresAt
        }
      }).catch());

    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    console.log(error);
    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been updated!",
      code: 200
    });
  }

  private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    const currentOffer: Offer = response.locals.offer;
    if (currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(merchant_id)) {
      var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id
    }, {
        $pull: {
          offers: {
            _id: offer_id
          }
        }
      }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been deleted!",
      code: 200
    });
  }
}

export default OffersController;

// const previousImage: Offer[] = await (this.user.aggregate([{
//   $unwind: '$offers'
// }, {
//   $match:
//   {
//     $and: [{
//       _id: new ObjectId(merchant_id)
//     }, {
//       'offers._id': new ObjectId(offer_id)
//     }]
//   }
// }, {
//   $project: {
//     _id: false,
//     offer_imageURL: '$offers.imageURL',
//   }
// }]));
