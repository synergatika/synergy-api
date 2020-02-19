import * as express from 'express';
import to from 'await-to-ts'

// Dtos
import MerchantDto from '../usersDtos/merchant.dto';
import MerchantID from '../usersDtos/merchant_id.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Merchant from '../usersInterfaces/merchant.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function (req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/profile'));
  },
  filename: function (req: RequestWithUser, file, cb) {
    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

class MerchantsController implements Controller {
  public path = '/merchants';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.readMerchants);
    this.router.get(`${this.path}/:merchant_id`, validationParamsMiddleware(MerchantID), this.readMerchantInfo);
    this.router.put(`${this.path}/:merchant_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(MerchantID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(MerchantDto), this.updateMerchantInfo);
  }

  private readMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    let error: Error, merchants: Merchant[];

    [error, merchants] = await to(this.user.find({
      access: 'merchant'
    }).select({
      "id": 1, "email": 1,
      "name": 1, "imageURL": 1,
      "contact": 1, "address": 1,
      "createdAt": 1, "sector": 1
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: merchants,
      code: 200
    });
  }

  private readMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    let error: Error, merchant: Merchant;
    [error, merchant] = await to(this.user.findOne({
      _id: merchant_id
    }).select({
      "id": 1, "email": 1,
      "name": 1, "imageURL": 1,
      "createdAt": 1, "sector": 1,
      "contact": 1, "address": 1,
      "payment": 1
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: merchant,
      code: 200
    });
  }

  private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const data: MerchantDto = request.body;
    const user: User = request.user;

    if (user.imageURL && request.file) {
      var imageFile = (user.imageURL).split('assets/profile/');
      await unlinkAsync(path.join(__dirname, '../assets/profile/' + imageFile[1]));
    }

    let error: Error, merchant: Merchant;
    [error, merchant] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
      $set: {
        name: data.name,
        imageURL: (request.file) ? `${process.env.API_URL}assets/profile/${request.file.filename}` : user.imageURL,
        sector: data.sector,
        'address.city': data.city,
        'address.postCode': data.postCode,
        'address.street': data.street,
        'address.coordinates': [data.lat, data.long],
        'contact.phone': data.phone,
        'contact.websiteURL': data.websiteURL,
        'payments.nationalBank': data.nationalBank,
        'payments.pireausBank': data.pireausBank,
        'payments.eurobank': data.eurobank,
        'payments.alphaBank': data.alphaBank,
        'payments.paypal': data.paypal
      }
    }, {
      "fields": { "name": 1, "imageURL": 1 },
      "new": true
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));

    response.status(200).send({
      data: merchant,
      code: 200
    })
  }
}

export default MerchantsController;
