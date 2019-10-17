import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import UsersException from '../exceptions/UsersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Merchant from '../usersInterfaces/merchant.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import MerchantDto from '../usersDtos/merchant.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'

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
        this.router.put(`${this.path}/:merchant_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(MerchantID), validationBodyMiddleware(MerchantDto), this.updateMerchantInfo);
    }

    private readMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, merchants: Merchant[];
        [error, merchants] = await to(this.user.find({
            access: 'merchant'
        }, {
            access: false,
            password: false, verified: false,
            updatedAt: false,
            offers: false, campaigns: false
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
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
        }, {
            access: false,
            password: false, verified: false,
            updatedAt: false,
            offers: false, campaigns: false
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: merchant,
            code: 200
        });
    }

    private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
        const data: MerchantDto = request.body;

        if ((request.user._id).toString() === (merchant_id).toString()) {
            let error: Error, merchant: Merchant;
            [error, merchant] = await to(this.user.findOneAndUpdate({
                _id: request.user._id
            }, {
                $set: {
                    name: data.name,
                    imageURL: data.imageURL,
                    sector: data.sector,
                    contact: {
                        websiteURL: data.contact.websiteURL,
                        phone: data.contact.phone,
                        address: {
                            street: data.contact.address.street,
                            city: data.contact.address.city,
                            zipCode: data.contact.address.zipCode
                        }
                    }
                }
            }, {
                projection: {
                    name: '$name',
                    imageURL: '$imageURL',
                    contact: '$contact'
                }
            }).catch());
            if (error) next(new DBException(422, 'DB ERROR'));
            response.status(200).send({
                data: merchant,
                code: 200
            })
        } else {
            next(new UsersException(403, 'OOps! You are not authorized to proceed in this action.'));
        }
    }
}

export default MerchantsController;
