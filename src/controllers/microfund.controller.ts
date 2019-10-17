import * as express from 'express';
import to from 'await-to-ts'

// Exceptions
import UsersException from '../exceptions/UsersException';
import DBException from '../exceptions/DBException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import Campaign from '../microfundInterfaces/campaign.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware'
// Models
import userModel from '../models/user.model';
// Dtos
import CampaignDto from '../microfundDtos/campaign.dto'
import { ObjectId } from 'mongodb';

import MerchantID from '../usersDtos/merchant_id.params.dto'
import CampaignID from '../microfundDtos/campaign_id.params.dto'

class MicrofundController implements Controller {
    public path = '/profile';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/campaigns`, this.readAllCampaigns);
        this.router.post(`${this.path}/campaigns`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(CampaignDto), this.createCampaign);
        this.router.get(`${this.path}/campaigns/:merchant_id`, validationParamsMiddleware(MerchantID), this.readCampaignsByStore);
        this.router.get(`${this.path}/campaigns/:merchant_id/:campaign_id`, validationParamsMiddleware(CampaignID), this.readACampaign);
        this.router.put(`${this.path}/campaigns/:merchant_id//:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), validationBodyMiddleware(CampaignDto), this.updateCampaign);
        this.router.delete(`${this.path}/campaigns/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), this.deleteACampaign);
        this.router.put(`${this.path}/campaigns/:merchant_id/:campaign_id/verify`, authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(CampaignID), this.verifyCampaign);
    }

    private readAllCampaigns = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

        let error: Error, campaigns: Campaign[];
        [error, campaigns] = await to(this.user.aggregate([{
            $unwind: '$campaigns'
        }, {
            $project: {
                _id: false,
                merchant_name: '$name',
                merchant_id: '$_id',
                campaign_id: '$campaigns._id',
                cost: '$campaigns.cost',
                description: '$campaigns.description',
                expiresAt: '$campaigns.expiresAt',
                createdAt: '$campaigns.createdAt'
            }
        }
        ]).exec().catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: campaigns,
            code: 200
        });
    }

    private createCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: CampaignDto = request.body;

        let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
        [error, results] = await to(this.user.updateOne({
            _id: request.user._id
        }, {
            $push: {
                campaigns: {
                    'description': data.description,
                    'expiresAt': data.expiresAt,
                    'state': "draft"
                }
            }
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(201).send({
            message: "Success! A new campaign has been created!",
            code: 201
        });
    }
    private readCampaignsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

        let error: Error, campaigns: Campaign[];
        [error, campaigns] = await to(this.user.aggregate([{
            $match: {
                _id: new ObjectId(merchant_id)
            }
        }, {
            $unwind: '$campaigns'
        }, {
            $project: {
                _id: false,
                merchant_name: '$name',
                merchant_id: '$_id',
                campaign_id: '$campaigns._id',
                description: '$campaigns.description',
                expiresAt: '$campaigns.expiresAt',
                createdAt: '$campaigns.createdAt'
            }
        }
        ]).exec().catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: campaigns,
            code: 200
        });
    }

    private readACampaign = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
        const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

        let error: Error, campaign: Campaign;
        [error, campaign] = await to(this.user.findOne({
            _id: merchant_id, 
            'campaigns._id': campaign_id
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            data: campaign,
            code: 200
        });
    }

    private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
        const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
        const data: CampaignDto = request.body;

        if ((request.user._id).toString() === (merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id,
                'campaigns._id': campaign_id
            }, {
                $set:
                {
                    'campaigns.$[]._id': campaign_id,
                    'campaigns.$[].descript': data.description,
                    'campaigns.$[].expiresAt': data.expiresAt,
                    'campaigns.$[].state': "checking"
                }
            }).catch());
            if (error) next(new DBException(422, 'DB ERROR'));
            response.status(200).send({
                message: "Success! Campaign " + campaign_id + " has been updated!",
                code: 200
            });
        } else {
            next(new UsersException(403, 'OOps! You are not authorized to proceed in this action.'));
        }
    }

    private deleteACampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
        const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

        if ((request.user._id).toString() === (merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id
            }, {
                $pull: {
                    campaigns: {
                        _id: campaign_id
                    }
                }
            }).catch());
            if (error) next(new DBException(422, 'DB ERROR'));
            response.status(200).send({
                message: "Success! Campaign " + campaign_id + " has been deleted!",
                code: 200
            });
        } else {
            next(new UsersException(403, 'OOps! You are not authorized to proceed in this action.'));
        }
    }

    private verifyCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
        const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
        
        let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
        [error, results] = await to(this.user.updateOne({
            _id: merchant_id,
            'campaigns._id': campaign_id
        }, {
            $set:
            {
                'campaigns.$[].state': "public"
            }
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
            message: "Success! Campaign " + campaign_id + " has been verified!",
            code: 200
        });
    }
}

export default MicrofundController;
