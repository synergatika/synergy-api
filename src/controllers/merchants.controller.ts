import * as express from 'express';

// Exceptions
import UsersException from '../exceptions/UsersException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import User from '../users/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
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
        this.router.put(`${this.path}/:merchant_id`, authMiddleware, accessMiddleware.onlyAsMerchant, this.updateMerchantInfo);
    }

    private getMerchants = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchants = await this.user.find({ access: 'merchant' }, { password: false, verified: false });
        console.log(merchants)
        response.send(merchants);
    }

    private getMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant = await this.user.findOne({ _id: request.user._id })
        merchant.password = undefined;
        response.send(merchant);
    }

    private updateMerchantInfo = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: MerchantDto = request.body;
        if (request.user._id === request.params.merchant_id) {
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
                        next(new UsersException(404, 'No user'));
                    }
                });
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }
}

export default MerchantsController;
