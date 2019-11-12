import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');
// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import EarnPointsDto from '../loyaltyDtos/earnPoints.dto'
import RedeemPointsDto from '../loyaltyDtos/usePoints.dto'
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
import transactionModel from '../models/transaction.model';

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;
    private transaction = transactionModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/earn`, authMiddleware, accessMiddleware.confirmPassword,/*accessMiddleware.onlyAsMerchant,*/ validationBodyMiddleware(EarnPointsDto), this.earnToken);
        this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.confirmPassword, validationBodyMiddleware(RedeemPointsDto), this.redeemToken);
        this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance);
        this.router.get(`${this.path}/transactions`, authMiddleware, this.readTransactions);
        this.router.get(`${this.path}/partners_info`, authMiddleware, this.partnersInfoLength);
        this.router.get(`${this.path}/transactions_info`, authMiddleware, this.transactionInfoLength);
    }

    private earnToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: EarnPointsDto = request.body;
        const _partner = (serviceInstance.unlockWallet(request.user.account, data.password)).address;

        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            $or: [{
                email: data._to
            }, {
                'account.address': data._to
            }]
        }).select({
            "_id": 1, "email": 1,
            "account": 1
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        else if (!user) {// Have to create a customer (/auth/register/customer) and then transfer points
            response.status(204).send({
                message: "User is not registered! Please create a new customer's account!",
                code: 204
            });
        } else {
            await serviceInstance.getLoyaltyAppContract()
                .then((instance) => {
                    return instance.earnPoints(this.amountToPoints(data._amount), user.account.address, _partner, serviceInstance.address)
                        .then(async (result: any) => {
                            console.log("TEST: " + request.user.name, request.user.email);
                            await this.transaction.create({
                                ...result, type: "EarnPoints",
                                from_id: request.user._id, to_id: user._id,
                                info: {
                                    from_name: request.user.name, from_email: request.user.email,
                                    to_email: user.email, points: this.amountToPoints(data._amount)
                                }
                            });
                            response.status(201).send({
                                data: result,
                                code: 201
                            });
                        })
                        .catch((error: Error) => {
                            console.log(error);
                            next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + user + "/n" + request.user))
                        })
                })
                .catch((error) => {
                    console.log(error);
                    next(new UnprocessableEntityException("Error: " + error.toString() + "/n" + user + "/n" + request.user))
                })
        }
    }

    private redeemToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: RedeemPointsDto = request.body;
        const _partner = (serviceInstance.unlockWallet(request.user.account, data.password)).address;

        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            $or: [{
                email: data._to
            }, {
                'account.address': (data._to)
            }]
        }).select({
            "email": 1, "account": 1
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        else if (!user) {
            response.status(204).send({
                message: "User is not registered! Please repeat!",
                code: 204
            });
        } else {
            await serviceInstance.getLoyaltyAppContract()
                .then((instance) => {
                    return instance.usePoints(data._points, user.account.address, _partner, serviceInstance.address)
                        .then(async (result: any) => {
                            await this.transaction.create({
                                ...result, type: "RedeemPoints",
                                from_id: request.user._id, to_id: user._id,
                                info: {
                                    from_name: request.user.name, from_email: request.user.email,
                                    to_email: user.email, points: data._points
                                }
                            });
                            response.status(201).send({
                                data: result,
                                code: 201
                            });
                        })
                        .catch((error: Error) => {
                            console.log(error);
                            next(new UnprocessableEntityException('Blockchain Error'))
                        })
                })
                .catch((error) => {
                    console.log(error);
                    next(new UnprocessableEntityException('Blockchain Error'))
                });
        }
    }

    private readBalance = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const _member = request.user.account.address;
        await serviceInstance.getLoyaltyAppContract()
            .then((instance) => {
                return instance.members(_member)
                    .then((results: any) => {
                        response.status(200).send({
                            data: results,
                            code: 200
                        });
                    })
                    .catch((error: Error) => {
                        console.log(error);
                        next(new UnprocessableEntityException('Blockchain Error'))
                    })
            })
            .catch((error) => {
                console.log(error);
                next(new UnprocessableEntityException('Blockchain Error'))
            })
    }

    private readTransactions = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

        let error: Error, transactions: any;
        [error, transactions] = await to(this.transaction.find({
            to_id: request.user._id, $or: [{ type: "EarnPoints" }, { type: "RedeemPoints" }]
        }).select({
            "_id": 1, "type": 1,
            "from_id": 1, "to_id": 1,
            "info": 1, "tx": 1,
            "createdAt": 1
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        console.log(transactions);
        response.status(200).send({
            data: transactions,
            code: 200
        });

    }

    private partnersInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        await serviceInstance.getLoyaltyAppContract()
            .then((instance) => {
                return instance.partnersInfoLength()
                    .then((results: any) => {
                        response.status(200).send({
                            data: results,
                            code: 200
                        });
                    })
                    .catch((error: Error) => {
                        console.log(error);
                        next(new UnprocessableEntityException('Blockchain Error'))
                    })
            })
            .catch((error) => {
                console.log(error);
                next(new UnprocessableEntityException('Blockchain Error'))
            })
    }

    private transactionInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        await serviceInstance.getLoyaltyAppContract()
            .then((instance) => {
                return instance.transactionsInfoLength()
                    .then((results: any) => {
                        response.status(200).send({
                            data: results,
                            code: 200
                        });
                    })
                    .catch((error: Error) => {
                        console.log(error);
                        next(new UnprocessableEntityException('Blockchain Error'))
                    })
            })
            .catch((error) => {
                console.log(error);
                next(new UnprocessableEntityException('Blockchain Error'))
            })
    }

    private amountToPoints(_amount: number): number {
        const _points: number = _amount;
        return _points;
    }
}

export default LoyaltyController;