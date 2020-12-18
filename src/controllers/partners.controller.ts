import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import PartnerDto from '../usersDtos/partner.dto';
import PartnerID from '../usersDtos/partner_id.params.dto';
import PartnerPaymentsDto from '../usersDtos/partner_payments.dto';

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import Partner from '../usersInterfaces/partner.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.partnerSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';

class PartnersController implements Controller {
  public path = '/partners';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPartners);
    this.router.get(`${this.path}/:partner_id`, validationParamsMiddleware(PartnerID), this.readPartnerInfo);

    this.router.put(`${this.path}/:partner_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(PartnerID), accessMiddleware.belongsTo,
      this.declareStaticPath, uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(PartnerDto), this.updatePartnerInfo);

    this.router.put(`${this.path}/payments/:partner_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(PartnerID), accessMiddleware.belongsTo,
      validationBodyMiddleware(PartnerPaymentsDto), this.updatePartnerPayment);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'partner';
    next();
  }

  private readPartners = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, partners: Partner[];
    [error, partners] = await to(this.user.find({
      $and: [
        { 'activated': true },
        { 'access': 'partner' }
      ]
    }).select({
      "id": 1,
      "email": 1,
      "name": 1,
      "slug": 1,
      "imageURL": 1,
      "sector": 1,
      "description": 1,
      "subtitle": 1,
      "timetable": 1,
      "phone": 1,
      "address": 1,
      "contacts": 1,
      "payments": 1,
      "createdAt": 1
    }).sort('-createdAt')
      .limit(offset.limit).skip(offset.skip)
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: partners,
      code: 200
    });
  }

  private readPartnerInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    let error: Error, partner: Partner;
    [error, partner] = await to(this.user.findOne({
      $or: [
        { _id: ObjectId.isValid(partner_id) ? partner_id : new ObjectId() },
        { slug: partner_id }
      ]
    }).select({
      "id": 1,
      "email": 1,
      "name": 1,
      "slug": 1,
      "imageURL": 1,
      "sector": 1,
      "description": 1,
      "subtitle": 1,
      "timetable": 1,
      "phone": 1,
      "address": 1,
      "contacts": 1,
      "payments": 1,
      "createdAt": 1
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: partner,
      code: 200
    });
  }

  private updatePartnerInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const data: PartnerDto = request.body;
    const user: User = request.user;

    if (user['imageURL'] && request.file) {
      var imageFile = (user['imageURL']).split('assets/static/');
      const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
      if (existFile(file)) await deleteFile(file);
    }
    // if ((user.imageURL && (user.imageURL).includes(partner_id)) && request.file) {
    //   // if (user.imageURL && request.file) {
    //   var imageFile = (user.imageURL).split('assets/profile/');
    //   await deleteFile(path.join(__dirname, '../assets/profile/' + imageFile[1]));
    // }

    let error: Error, partner: Partner;
    [error, partner] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
        $set: {
          'name': data.name,
          'slug': await createSlug(request),
          'subtile': data.subtitle,
          'description': data.description,
          'imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : user.imageURL,
          'sector': data.sector,
          'phone': data.phone,
          'address.city': data.city,
          'address.postCode': data.postCode,
          'address.street': data.street,
          'address.coordinates': [data.lat, data.long],
          'contact.phone': data.phone,
          'contacts': JSON.parse(data.contacts),
          'timetable': data.timetable
        }
      }, {
        "fields": { "name": 1, "imageURL": 1 },
        "new": true
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: partner,
      code: 200
    })
  }

  private updatePartnerPayment = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const data: PartnerPaymentsDto = request.body;
    const user: User = request.user;

    let error: Error, partner: Partner;
    [error, partner] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
        $set: {
          'payments': data.payments,
        }
      }, {
        "fields": { "name": 1, "imageURL": 1 },
        "new": true
      }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: partner,
      code: 200
    })
  }
}

export default PartnersController;
