import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Exceptions

// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import PointsDto from '../loyaltyDtos/points.dto'

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/earn`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(PointsDto), this.earnToken);
        this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, validationBodyMiddleware(PointsDto), this.redeemToken);
        this.router.get(`${this.path}/transactions`, authMiddleware, this.readTransactions);
        this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance)
    }
    private earnToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    }

    private redeemToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    }

    private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    }

    private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    }
}

export default LoyaltyController;