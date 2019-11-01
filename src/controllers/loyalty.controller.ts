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

var accounts =
    [{
        ad: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        pk: '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
    }, {
        ad: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
        pk: '0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f'
    }, {
        ad: '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef',
        pk: '0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1'
    }, {
        ad: '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
        pk: '0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c'
    }, {
        ad: '0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2',
        pk: '0x388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418'
    }, {
        ad: '0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e',
        pk: '0x659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63'
    }, {
        ad: '0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5',
        pk: '0x82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8'
    }, {
        ad: '0x0F4F2Ac550A1b4e2280d04c21cEa7EBD822934b5',
        pk: '0xaa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7'
    }, {
        ad: '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
        pk: '0x0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4'
    }, {
        ad: '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
        pk: '0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
    }]

class LoyaltyController implements Controller {
    public path = '/loyalty';
    public router = express.Router();
    private user = userModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/earn`, authMiddleware, accessMiddleware.confirmPassword,/*accessMiddleware.onlyAsMerchant,*/ validationBodyMiddleware(EarnPointsDto), this.earnToken);
        this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, accessMiddleware.confirmPassword, validationBodyMiddleware(RedeemPointsDto), this.useToken);
        this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance);
        this.router.get(`${this.path}/partners`, authMiddleware, this.partnersInfoLength);
        this.router.get(`${this.path}/transactions`, authMiddleware, this.transactionsInfoLength);
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
        } else {
            await serviceInstance.getLoyaltyAppContract()
                .then((instance) => {
                    return instance.earnPoints(this.amountToPoints(data._amount), user.account.address, _partner, { from: accounts[0].ad })
                        .then((results: any) => {
                            response.status(200).send({
                                data: results,
                                code: 200
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

    private useToken = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const data: RedeemPointsDto = request.body;
        const _partner = (serviceInstance.unlockWallet(request.user.account, data.password)).address;

        let error: Error, user: User;
        [error, user] = await to(this.user.findOne({
            $or: [{
                email: data._to
            }, {
                'account.address': (data._to)
            }]
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
        else if (!user) {
            response.status(204).send({
                message: "User is not registered! Please repeat!",
                code: 204
            });
        } else {
            await serviceInstance.getLoyaltyAppContract()
                .then((instance) => {
                    return instance.usePoints(data._points, user.account.address, _partner, { from: accounts[0].ad })
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


    private transactionsInfoLength = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
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