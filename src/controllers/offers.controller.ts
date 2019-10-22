import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Exceptions
import UsersException from '../exceptions/UsersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import OfferDto from '../loyaltyDtos/offer.dto'

import MerchantID from '../usersDtos/merchant_id.params.dto'
import OfferID from '../loyaltyDtos/offer_id.params.dto'

class OffersController implements Controller {
    public path = '/loyalty/offers';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/`, this.readAllOffers);
        this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(OfferDto), this.createOffer);
        this.router.get(`${this.path}/:merchant_id`, validationParamsMiddleware(MerchantID), this.readOffersByStore);
        this.router.put(`${this.path}/:merchant_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(OfferID), validationBodyMiddleware(OfferDto), this.updateOffer);
        this.router.delete(`${this.path}/:merchant_id/:offer_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(OfferID), this.deleteOffer);
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
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: offers,
            code: 200
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
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(201).send({
            message: "Success! A new offer has been created!",
            code: 201
        });
    }

    private readOffersByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

        let error: Error, offers: Offer[];
        [error, offers] = await to(this.user.aggregate([{
            $match: {
                _id: new ObjectId(merchant_id)
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
        }]).exec().catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: offers,
            code: 200
        });
    }

    private updateOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
        const offer_id: OfferID["offer_id"] = request.params.offer_id;
        const data: OfferDto = request.body;

        if ((request.user._id).toString() === (merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id,
                'offers._id': offer_id
            }, {
                $set:
                {
                    'offers.$[]._id': offer_id,
                    'offers.$[].description': data.description,
                    'offers.$[].cost': data.cost,
                    'offers.$[].expiresAt': data.expiresAt
                }
            }).catch());
            if (error) next(new DBException(422, 'DB ERROR'));
            response.status(200).send({
                message: "Success! Offer " + offer_id + " has been updated!",
                code: 200
            });
        } else {
            next(new UsersException(403, 'OOps! You are not authorized to proceed in this action.'));
        }
    }

    private deleteOffer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
        const offer_id: OfferID["offer_id"] = request.params.offer_id;

        if ((request.user._id).toString() === (merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id
            }, {
                $pull: {
                    offers: {
                        _id: offer_id
                    }
                }
            }).catch());
            if (error) next(new DBException(422, 'DB ERROR'));
            response.status(200).send({
                message: "Success! Offer " + offer_id + " has been deleted!",
                code: 200
            });
        } else {
            next(new UsersException(403, 'OOps! You are not authorized to proceed in this action.'));
        }
    }
}

export default OffersController;