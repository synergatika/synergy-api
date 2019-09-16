import * as express from 'express';

// Exceptions
import AuthenticationException from '../exceptions/AuthenticationException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import User from '../users/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
// Models
import userModel from '../users/users.model';
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
        this.router.get(`${this.path}/:merchant_id`, authMiddleware, this.getMerchantInfo);
        this.router.put(`${this.path}/:merchant_id`, authMiddleware, this.updateMerchantInfo);
    }

    private getMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchants = this.user.find({ access: 'merchant' })
        console.log(merchants)
        response.send(merchants);
    }

    private getMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant = this.user.findOne({ _id: request.user._id })
        response.send(merchant);
    }

    private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: MerchantDto = request.body;
        this.user.findOneAndUpdate(
            {
                _id: request.user._id
            },
            {
                $set: {
                    name: data.name,
                    imageURL: data.imageURL,
                    contact: {
                        phone: data.contact.phone,
                        address: {
                            street: data.contact.address.street,
                            city: data.contact.address.city,
                            zipCode: data.contact.address.zipCode,
                        }
                    }
                }
            }, { new: true })
            .then((user) => {
                if (user) {
                    user.password = undefined;
                    response.send(user);
                } else {
                    next(new AuthenticationException(404, 'No user'));
                }
            });
    }
}

export default MerchantsController;
