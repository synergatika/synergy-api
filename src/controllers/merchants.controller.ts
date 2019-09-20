import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import DBException from '../exceptions/DBException';
import UsersException from '../exceptions/UsersException';
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
        if (error) new DBException(404, 'DB Error');
        response.status(200).send({
            data: merchants,
            message: "OK"
        });
    }

    private getMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, merchant: Merchant;
        [error, merchant] = await to(this.user.findOne({
            _id: request.params.merchant_id
        }, {
            password: false, verified: false, offers: false
        }).catch());
        if (error) new DBException(404, 'DB Error');
        response.status(200).send({
            data: merchant,
            message: "OK"
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
                        web: data.contact.web,
                        phone: data.contact.phone,
                        address: {
                            street: data.contact.address.street,
                            city: data.contact.address.city,
                            zipCode: data.contact.address.zipCode,
                        }
                    }
                }
            }, { new: true }).catch());
            if (error) new DBException(404, 'DB Error');
            merchant.password = undefined;
            response.status(200).send({
                data: merchant,
                message: "OK"
            })
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }
}

export default MerchantsController;
