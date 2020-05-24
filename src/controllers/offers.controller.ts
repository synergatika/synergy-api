import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

// Dtos
import OfferDto from '../loyaltyDtos/offer.dto'
import PartnerID from '../usersDtos/partner_id.params.dto'
import OfferID from '../loyaltyDtos/offer_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';
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
import FilesMiddleware from '../middleware/files.middleware';
import SlugHelper from '../middleware/slug.helper';
import OffsetHelper from '../middleware/offset.helper';
// Helper's Instance
const uploadFile = FilesMiddleware.uploadItem;
const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.offerSlug;
const offsetParams = OffsetHelper.offsetLimit;
// Models
import userModel from '../models/user.model';

class OffersController implements Controller {
  public path = '/loyalty/offers';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readAllOffers);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), this.createOffer);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readOffersByStore);
    this.router.get(`${this.path}/:partner_id/:offer_id`, validationParamsMiddleware(OfferID), this.readOffer);
    this.router.put(`${this.path}/:partner_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(OfferDto), itemsMiddleware.offerMiddleware, this.updateOffer);
    this.router.delete(`${this.path}/:partner_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(OfferID), accessMiddleware.belongsTo, itemsMiddleware.offerMiddleware, this.deleteOffer);
  }

  private readAllOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;

    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

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
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',
        partner_address: '$address',

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
          "slug": await createSlug(request),
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
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
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
        partner_imageURL: '$imageURL',
        partner_address: '$address',

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
        partner_imageURL: '$imageURL',
        partner_address: '$address',

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
    else if (!offers.length) {
      return next(new NotFoundException('OFFER_NOT_EXISTS'));
    }

    response.status(200).send({
      data: offers[0],
      code: 200
    });
  }

  private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;
    const data: OfferDto = request.body;

    const currentOffer: Offer = response.locals.offer;
    if ((currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) && request.file) {
      //if (currentOffer.offer_imageURL && request.file) {
      var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'offers._id': offer_id
      }, {
      '$set': {
        'offers.$._id': offer_id,
        'offers.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentOffer.offer_imageURL,
        'offers.$.title': data.title,
        'offers.$.slug': await createSlug(request),
        'offers.$.subtitle': data.subtitle,
        'offers.$.description': data.description,
        'offers.$.cost': data.cost,
        'offers.$.expiresAt': data.expiresAt
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been updated!",
      code: 200
    });
  }

  private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: OfferID["partner_id"] = request.params.partner_id;
    const offer_id: OfferID["offer_id"] = request.params.offer_id;

    const currentOffer: Offer = response.locals.offer;
    if (currentOffer.offer_imageURL && (currentOffer.offer_imageURL).includes(partner_id)) {
      var imageFile = (currentOffer.offer_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

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
    if (error) return next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Offer " + offer_id + " has been deleted!",
      code: 200
    });
  }
}

export default OffersController;
