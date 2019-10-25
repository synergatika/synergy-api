import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import EarnPointsDto from '../loyaltyDtos/earnPoints.dto'
import RedeemPointsDto from '../loyaltyDtos/redeemPoints.dto'

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/earn`, validationBodyMiddleware(EarnPointsDto), this.earnToken);

        //this.router.post(`${this.path}/earn`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(PointsDto), this.earnToken);
        this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(RedeemPointsDto), this.redeemToken);
        this.router.get(`${this.path}/transactions`, authMiddleware, this.readTransactions);
        this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance)
    }

    private earnToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: EarnPointsDto = request.body;

        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            $or: [
                { email: data._to },
                {
                    'account.address': data._to
                }
            ]
        }, {
            password: false, access: false,
            imageURL: false, sector: false,
            email_verified: false, pass_verified: false,
            createdAt: false, updatedAt: false,
            contact: false, offers: false, campaigns: false,
            restorationToken: false, restorationExpiration: false,
            verificationToken: false, verificationExpiration: false
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        else if (!user) {// Have to create a customer (/auth/register/customer) and then transfer points
            response.status(204).send({
                message: "User is not registered! Please create a new customer's account!",
                code: 204
            });
        }
        const _points = this.amountToPoints(data._amount);
        // Here call blockchain with request.user.account.address & user.account.address & points
        response.status(200).send({
            data: {
                _partnerAddress: request.user.account.address,
                _memberAddress: user.account.address,
                _points: _points
            },
            code: 200
        });
    }

    private redeemToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: RedeemPointsDto = request.body;

        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            $or: [
                { email: data._to },
                {
                    'account.address': data._to
                }
            ]
        }, {
            password: false, access: false,
            imageURL: false, sector: false,
            email_verified: false, pass_verified: false,
            createdAt: false, updatedAt: false,
            contact: false, offers: false, campaigns: false,
            restorationToken: false, restorationExpiration: false,
            verificationToken: false, verificationExpiration: false
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));

        // Here call blockchain with request.user.account.address & user.account.address & points
        response.status(200).send({
            data: {
                _partnerAddress: request.user.account.address,
                _memberAddress: user.account.address,
                _points: data._points
            },
            code: 200
        });
    }

    private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        // Here call blockchain by request.user.account.address
        response.status(200).send({
            data: {
                account: request.user.account
            },
            code: 200
        });
    }


    private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        // Here call blockchain by request.user.account.address
        response.status(200).send({
            data: {
                account: request.user.account
            },
            code: 200
        });
    }

    private amountToPoints(_amount: number): number {
        const _points: number = Math.round(_amount * 0.001);
        return _points;
    }
}

export default LoyaltyController;