import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import OffersException from '../exceptions/OffersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import OfferDto from '../loyaltyDtos/offer.dto'
import UsersException from '../exceptions/UsersException';
import { ObjectId } from 'mongodb';

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/offers`, this.readAllOffers);
        this.router.post(`${this.path}/offers`, authMiddleware, accessMiddleware.onlyAsMerchant, validationMiddleware(OfferDto), this.createOffer);
        this.router.get(`${this.path}/offers/:merchant_id`, this.readOffersByStore);
        this.router.put(`${this.path}/offers/:merchant_id/:offer_id`, authMiddleware, validationMiddleware(OfferDto), this.updateOffer);
        this.router.delete(`${this.path}/offers/:merchant_id/:offer_id`, authMiddleware, this.deleteOffer);
    }

    private readAllOffers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

        let error: Error, offers: Offer[];
        [error, offers] = await to(this.user.aggregate([{
            $unwind: '$offers'
        }, {
            $project: {
                _id: false,
                merchant_name: '$name',
                merchant_id: '$_id',
                offer_id: '$offers._id',
                cost: '$offers.cost',
                description: '$offers.description',
                expiresAt: '$offers.expiresAt',
                createdAt: '$offers.createdAt'
            }
        }
        ]).exec().catch());
        if (error) next(new DBException(422, "DB Error"));
        response.status(200).send({
            data: offers,
            message: "OK"
        });
    }

    private createOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: OfferDto = request.body;

        let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
        [error, results] = await to(this.user.updateOne({
            _id: request.user._id
        }, {
            $push: {
                offers: {
                    "cost": data.cost,
                    "description": data.description,
                    "expiresAt": data.expiresAt
                }
            }
        }).catch());
        if (error) next(new DBException(422, "DB Error"));
        response.status(201).send({
            data: {},
            message: "Success! A new offer has been created!"
        });
    }

    private readOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        let error: Error, offers: Offer[];
        [error, offers] = await to(this.user.aggregate([{
            $match: {
                _id: new ObjectId(request.params.merchant_id)
            }
        }, {
            $unwind: '$offers'
        }, {
            $project: {
                _id: false,
                merchant_name: '$name',
                merchant_id: '$_id',
                offer_id: '$offers._id',
                cost: '$offers.cost',
                description: '$offers.description',
                expiresAt: '$offers.expiresAt',
                createdAt: '$offers.createdAt'
            }
        }
        ]).exec().catch());
        /*
                [error, offers] = await to(this.user.find({
                    _id: request.params.merchant_id
                }, {
                    offers: true
                }).catch());
         */
        if (error) next(new DBException(422, error.message));
        response.status(200).send({
            data: offers,
            message: "OK"
        });

    }

    private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: OfferDto = request.body;

        if ((request.user._id).toString() === (request.params.merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id,
                'offers._id': request.params.offer_id
            }, {
                $set:
                {
                    'offers.$[]._id': request.params.offer_id,
                    'offers.$[].descript': data.description,
                    'offers.$[].cost': data.cost,
                    'offers.$[].expiresAt': data.expiresAt
                }
            }).catch());
            if (error) next(new DBException(422, error.message));
            response.status(200).send({
                data: {},
                message: "Success! Offer has been updated!"
            });
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }

    private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

        if ((request.user._id).toString() === (request.params.merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id
            }, {
                $pull: {
                    offers: {
                        _id: request.params.offer_id
                    }
                }
            }).catch());
            if (error) next(new DBException(422, error.message));
            response.status(200).send({
                data: {},
                message: "Success! Offer has been deleted!"
            });
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }
}

export default LoyaltyController;