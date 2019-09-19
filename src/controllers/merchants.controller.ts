import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
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
import DBException from '../exceptions/DBException';

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
        this.router.put(`${this.path}/:merchant_id`, authMiddleware, validationMiddleware(MerchantDto), accessMiddleware.onlyAsMerchant, this.updateMerchantInfo);
    }

    private getMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, results: Merchant[];
        [error, results] = await to(this.user.find({
            access: 'merchant'
        }, {
            password: false, verified: false, offers: false
        }).catch());
        if (error) next(new UsersException(422, "what?"));
        response.send(results);
    }

    private getMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, results: Merchant;
        [error, results] = await to(this.user.findOne({
            _id: request.params.merchant_id
        }, {
            password: false, verified: false, offers: false
        }).catch());
        if(error) next(new UsersException(422,"Problem"))
        response.send(results);
    }

    private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: MerchantDto = request.body;
        if (request.user._id === request.params.merchant_id) {
            let error: Error, results: Merchant;
            [error, results] = await to(this.user.findOneAndUpdate({
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
            if (error) next(new UsersException(404, 'No user'));
            results.password = undefined;
            response.send(results);
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }
}

export default MerchantsController;
