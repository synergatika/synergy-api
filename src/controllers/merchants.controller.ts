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
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import MerchantDto from '../usersDtos/merchant.dto'

class MerchantsController implements Controller {
    public path = '/merchants';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}`, this.getMerchants);
        this.router.get(`${this.path}/:merchant_id`, this.getMerchantInfo);
        this.router.put(`${this.path}/:merchant_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationMiddleware(MerchantDto), this.updateMerchantInfo);
    }

    private getMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, merchants: Merchant[];
        [error, merchants] = await to(this.user.find({
            access: 'merchant'
        }, {
            password: false, verified: false, offers: false
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: merchants,
            code: 200
        });
    }

    private getMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, merchant: Merchant;
        [error, merchant] = await to(this.user.findOne({
            _id: request.params.merchant_id
        }, {
            password: false, verified: false, 
            offers: false, campaigns: false
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: merchant,
            code: 200
        });
    }

    private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: MerchantDto = request.body;
        if ((request.user._id).toString() === (request.params.merchant_id).toString()) {
            let error: Error, merchant: Merchant;
            [error, merchant] = await to(this.user.findOneAndUpdate({
                _id: request.user._id
            }, {
                $set: {
                    name: data.name,
                    imageURL: data.imageURL,
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
            next(new UsersException(404, 'Not Authorized'));
        }
    }
}

export default MerchantsController;
