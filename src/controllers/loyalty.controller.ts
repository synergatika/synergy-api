import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import OffersException from '../exceptions/OffersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Offer from '../interfaces/offer.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import OfferDto from '../loyaltyDtos/offer.dto'

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/offers`, this.getOffers);
        this.router.post(`${this.path}/offers`, authMiddleware, accessMiddleware.onlyAsMerchant, validationMiddleware(OfferDto), this.postAnOffer);
        this.router.get(`${this.path}/offers/:merchant_id`, this.getOffersByStore);
        this.router.put(`${this.path}/offers/:merchant_id/:offer_id`, authMiddleware, validationMiddleware(OfferDto), this.updateAnOffer);
        this.router.delete(`${this.path}/offers/:merchant_id/:offer_id`, authMiddleware, this.deleteAnOffer);
    }

    private getOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

        let err: Error, results: Offer[];
        [err, results] = await to(this.user.aggregate([
            {
                $unwind: '$offers'
            },
            {
                $project: {
                    _id: false, name: '$name', merchant_id: '$_id', offer_id: '$offers._id', cost: '$offers.cost', description: '$offers.description', expiresAt: '$offers.expiresAt'
                }
            }
        ]).exec().catch());
        if (err) next(new DBException(422, err.message));
        response.send(results);
    }

    private postAnOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: OfferDto = request.body;

        let err: Error, results: Offer;
        [err, results] = await to(this.user.updateOne({ _id: request.user._id },
            {
                $push: {
                    offers: {
                        "cost": data.cost,
                        "description": data.description,
                        "expiresAt": data.expiresAt
                    }
                }
            }).catch());
        if (err) next(new DBException(422, err.message));
        response.send(results);
    }

    private getOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        let err: Error, results: Offer[];
        [err, results] = await to(this.user.find({
            _id: request.params.merchant_id
        },
            {
                offers: true
            }).catch());
        if (err) next(new DBException(422, err.message));
        response.send(results);
    }

    private updateAnOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: OfferDto = request.body;

        let err: Error, results: Offer;
        [err, results] = await to(this.user.update(
            { _id: request.user._id, 'offers._id': request.params.offer_id },
            { $set: { 'offers.$[]': { _id: request.params.offer_id, description: data.description, cost: data.cost, expiresAt: data.expiresAt } } }, function (error, solve) {
                console.log("S: " + JSON.stringify(solve));
                console.log("E: " + error);
            }).catch());
        if (err) next(new DBException(422, err.message));
        response.send(results);
    }

    private deleteAnOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

        let err: Error, results: Object;
        [err, results] = await to(this.user.updateOne({ _id: request.user._id },
            {
                $pull: {
                    offers: {
                        _id: request.params.offer_id
                    }
                }
            }).catch());
        if (err) next(new DBException(422, err.message));
        response.send(results);
    }
}

export default LoyaltyController;