import * as express from 'express';

// Exceptions
import OffersException from '../exceptions/OffersException';
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
import { ObjectId } from 'bson';

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/offers`, this.getOffers);
        this.router.post(`${this.path}/offers`, authMiddleware, this.postAnOffer);
        this.router.get(`${this.path}/offers/:merchant_id`, this.getOffersByStore);
        this.router.put(`${this.path}/offers/:merchant_id/:offer_id`, authMiddleware, this.updateAnOffer);
    }

    private getOffers = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const offers = await this.user.aggregate([
            { $unwind: '$offers' },
            { $project: { name: '$name', offer_id: 1, cost: '$offers.cost', description: '$offers.description', expiresAt: '$offers.expiresAt' } }
        ]);
        response.send(offers);
        // const merchants = await this.user.find({ access: 'merchant' });
        // console.log(merchants)
        // response.send(merchants.map(({password, ...keepAttrs}) => keepAttrs));
    }

    private postAnOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data = request.body;
        await this.user.updateOne({ _id: request.user._id },
            {
                $push: {
                    offers: {
                        "cost": data.cost,
                        "description": data.description,
                        "expiresAt": data.expiresAt
                    }
                }
            })
        response.send("ok")
    }

    private getOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        const offers = await this.user.find({ _id: request.params.merchant_id }, { offers: true })
    }

    private updateAnOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data = request.body;
        console.log(request.params);
        console.log(request.user._id);

        this.user.update(
            { _id: request.user._id, 'offers._id': request.params.offer_id}, 
            {$set: {'offers.$[]': {_id: request.params.offer_id, description: data.description, cost: data.cost, expiresAt: data.expiresAt}}}, function(error, solve) {
                console.log("S: " + JSON.stringify(solve));
                console.log("E: " + error);
            }
          );
        //return res.send(200);
      }
    
    
}

export default LoyaltyController;