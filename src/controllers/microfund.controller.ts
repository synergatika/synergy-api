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
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware'
// Models
import userModel from '../models/user.model';
// Dtos
import CampaignDto from '../microfundDtos/campaign.dto'

class MicrofundController implements Controller {
    public path = '/profile';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/campaigns`, this.readAllCampaigns);
        this.router.post(`${this.path}/campaigns`, authMiddleware, accessMiddleware.onlyAsMerchant, validationMiddleware(CampaignDto), this.createCampaign);
        this.router.get(`${this.path}/campaigns/:merchant_id`, this.readCampaignsByStore);
        this.router.get(`${this.path}/campaigns/:merchant_id/:campaign_id`, this.readACampaign);
        this.router.put(`${this.path}/campaigns/:merchant_id//:campaign_id`, authMiddleware, validationMiddleware(CampaignDto), this.updateCampaign);
        this.router.delete(`${this.path}/campaigns/:merchant_id/:campaign_id`, authMiddleware, this.deleteACampaign);
        this.router.put(`${this.path}/campaigns/:merchant_id/:campaign_id/verify`, authMiddleware, this.verifyCampaign);
    }

    private readAllCampaigns = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

        let error: Error, campaigns: Campaign[];
        [error, campaigns] = await to(this.user.aggregate([{
            $unwind: '$campaigns'
        }, {
            $project: {
                _id: false, name: '$name', merchant_id: '$_id', campaign_id: '$campaigns._id', cost: '$campaigns.cost', description: '$campaigns.description', expiresAt: '$campaigns.expiresAt', createdAt: '$campaigns.createdAt'
            }
        }
        ]).exec().catch());
        if (error) next(new DBException(422, "DB Error"));
        response.status(200).send({
            data: campaigns,
            message: "OK"
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
                    "description": data.description,
                    "expiresAt": data.expiresAt
                }
            }
        }).catch());
        if (error) next(new DBException(422, "DB Error"));
        response.status(201).send({
            data: {},
            message: "Success! A new campaign has been created!"
        });
    }
    private readCampaignsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        let error: Error, campaigns: Campaign[];

        [error, campaigns] = await to(this.user.find({
            _id: request.params.merchant_id
        }, {
            campaigns: true
        }).catch());

        if (error) next(new DBException(422, error.message));
        response.status(200).send({
            data: campaigns,
            message: "OK"
        });
    }

    private readACampaign = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
        let error: Error, campaign: Campaign;
        [error, campaign] = await to(this.user.findOne({
            'campaigns._id': request.params.campaign_id
        }).catch());
        if (error) next(new DBException(422, "DB Error"));
        response.status(200).send({
            data: campaign,
            message: "OK"
        });
    }

    private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: CampaignDto = request.body;

        if ((request.user._id).toString() === (request.params.merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id,
                'campaigns._id': request.params.campaign_id
            }, {
                $set:
                {
                    'campaigns.$[]._id': request.params.campaign_id,
                    'campaigns.$[].descript': data.description,
                    'campaigns.$[].expiresAt': data.expiresAt
                }
            }).catch());
            if (error) next(new DBException(422, error.message));
            response.status(200).send({
                data: {},
                message: "Success! Camapign has been updated!"
            });
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }

    private deleteACampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        if ((request.user._id).toString() === (request.params.merchant_id).toString()) {
            let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
            [error, results] = await to(this.user.updateOne({
                _id: request.user._id
            }, {
                $pull: {
                    campaigns: {
                        _id: request.params.campaign_id
                    }
                }
            }).catch());
            if (error) next(new DBException(422, error.message));
            response.status(200).send({
                data: {},
                message: "Success! Camapign has been deleted!"
            });
        } else {
            next(new UsersException(404, 'Not Authorized'));
        }
    }

    private verifyCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    }
}

export default MicrofundController;
