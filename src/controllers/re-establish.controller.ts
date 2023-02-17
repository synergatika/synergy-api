import * as express from 'express';
import to from 'await-to-ts';
import path from 'path';
import { ObjectId } from 'mongodb';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../services/blockchain.service';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, Member, Partner, UserAccess, Post, TransactionStatus, RegistrationTransactionType, MicrocreditSupport } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';

/**
 * Models
 */
import userModel from '../models/user.model';
import postModel from '../models/post.model';
import eventModel from '../models/event.model';
import offerModel from '../models/offer.model';
import campaignModel from '../models/campaign.model';

import loyaltyModel from '../models/loyalty.model';

import registrationTransactionModel from '../models/registration.transaction.model';
import loyaltyTransactionModel from '../models/loyalty.transaction.model';
import microcreditTransactionModel from '../models/microcredit.transaction.model';
import supportModel from '../models/support.model';
import { RegisterUserWithoutPasswordDto } from '_dtos';
import microcreditModel from '../models/campaign.model';

/**
 * Transactions Util
 */
import RegistrationTransactionsUtil from '../utils/registration.transactions';
const transactionsUtil = new RegistrationTransactionsUtil();

class ReEstablishController implements Controller {
    public path = '/establish';
    public router = express.Router();
    // private userModel = userModel;
    // private registrationTransaction = registrationTransactionModel;
    // private loyaltyTransaction = loyaltyTransactionModel;
    // private microcreditTransaction = microcreditTransactionModel;

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // this.router.get(`${this.path}/update/account/:id`, this.updateUserBlockchainAccount);
        // this.router.get(`${this.path}/registration`, this.registrationIdentifier);
        // this.router.get(`${this.path}/loyalty`, this.loyaltyIdentifier);
        // this.router.get(`${this.path}/microcredit`, this.microcreditIdentifier);

        // this.router.get(`${this.path}/users`, this.establishUsers);
        // this.router.get(`${this.path}/campaigns`, this.establishCampaigns);
        // this.router.get(`${this.path}/loyalty`, this.removeLoyaltyHistory);
        // this.router.get(`${this.path}/microcredit`, this.removeMicrocreditHistory);
    }

    private transferItems = async () => {
        let error: Error, users: any[];
        [error, users] = await to(userModel.find({
            access: UserAccess.PARTNER
        }).catch());

        users.forEach((partner: any) => {

            partner.posts.forEach(async (post: any) => {
                await postModel.create({
                    ...post,
                    partner: new ObjectId(partner._id)
                })
            });

            partner.events.forEach(async (event: any) => {
                await eventModel.create({
                    ...event,
                    partner: new ObjectId(partner._id)
                })
            });

            partner.offers.forEach(async (offer: any) => {
                await offerModel.create({
                    ...offer,
                    partner: new ObjectId(partner._id)
                })
            });

            partner.microcredits.forEach(async (microcredit: any) => {
                await campaignModel.create({
                    ...microcredit,
                    partner: new ObjectId(partner._id)
                })
            });
        })
    }

    private updateRegistrationTransactions = async () => {
        let error: Error, transactions: any[];
        [error, transactions] = await to(registrationTransactionModel.find().catch());

        transactions.forEach(async (transaction: any) => {

            await registrationTransactionModel.updateOne({
                _id: transaction._id
            }, {
                $set: {
                    user: new ObjectId(transaction.user_id),
                    status: TransactionStatus.COMPLETED
                }
            })

        })
    }

    private updateLoyaltyTransactions = async () => {
        let error: Error, transactions: any[];
        [error, transactions] = await to(loyaltyTransactionModel.find().catch());

        transactions.forEach(async (transaction: any) => {

            await loyaltyTransactionModel.updateOne({
                _id: transaction._id
            }, {
                $set: {
                    partner: new ObjectId(transaction.partner_id),
                    member: new ObjectId(transaction.member_id),
                    offer: new ObjectId(transaction.offer_id),
                    status: TransactionStatus.COMPLETED
                }
            });


            let _error: Error, current_loyalty: any;
            [_error, current_loyalty] = await to(loyaltyModel.findOne({ member: new ObjectId(transaction.member_id) }).catch());

            await loyaltyModel.updateOne(
                {
                    member: new ObjectId(transaction.member_id)
                },
                {
                    member: new ObjectId(transaction.member_id),
                    currentPoints: (current_loyalty) ? current_loyalty.currentPoints + transaction.points : transaction.points
                },
                { upsert: true, new: true }
            )
        });
    }

    private updateUserBlockchainAccount = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        const user_id = request.params.id;

        /** Fetch User */
        let error: Error, user: User;
        [error, user] = await to(userModel.findOne({
            _id: user_id
        }).select({
            "_id": 1,
            "email": 1,
            "access": 1,
            "account": 1,
            "card": 1
        }).catch());

        /** Create new Account */
        const encryptBy = (user.email) ? user.email : user.card;
        const account = serviceInstance.createWallet(encryptBy);

        /** Update User Account */
        [error, user] = await to(userModel.updateOne({
            _id: user_id
        }, {
            "$set": {
                account: account
            }
        }, { new: true }).catch());

        let result: any;
        /** Update Registration Transaction */
        [error, result] = await to(registrationTransactionModel.updateMany(
            {
                user: new ObjectId(user_id)
            }, {
            "$set": {
                status: TransactionStatus.PENDING
            }
        }).catch());
        console.log("Update Registration Transactions:", result);

        /** Update Loyalty Transaction */
        [error, result] = await to(loyaltyTransactionModel.updateMany({
            "$or": [
                { partner: new ObjectId(user_id) },
                { member: new ObjectId(user_id) }
            ]
        }, {
            "$set": {
                status: TransactionStatus.PENDING
            }
        }).catch());
        console.log("Update Loyalty Transactions:", result);

        /** Update Campaigns */
        [error, result] = await to(campaignModel.updateMany({
            partner: new ObjectId(user_id)
        }, {
            "$set": {
                registered: TransactionStatus.PENDING
            }
        }).catch());

        let campaigns: MicrocreditCampaign[] = await campaignModel.find({ partner: new ObjectId(user_id) });
        console.log("Microcredit Campaigns:", campaigns.map(c => c._id));

        /** Update Registration Transaction */
        let supports: MicrocreditSupport[];
        [error, supports] = await to(supportModel.find({
            "$or": [
                { member: new ObjectId(user_id) },
                { campaign: { "$in": campaigns?.map(c => c._id) } }
            ]
        }).catch());
        console.log("Microcredit Supports:", supports?.map(c => c._id));

        [error, result] = await to(microcreditTransactionModel.updateMany({
            support: { "$in": supports?.map(s => s._id) }
        }, {
            "$set": {
                registered: TransactionStatus.PENDING
            }
        }).catch());
        console.log("Update Microcredit Transactions:", result);

        response.status(200).send({
            message: "User's Blockchain Account has been successfully updated!",
            code: 200
        });
    }

    private registrationIdentifier = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, registration_transactions: { user: ObjectId, type: RegistrationTransactionType }[];
        [error, registration_transactions] = await to(registrationTransactionModel.find().select({
            user: 1, type: 1
        }).catch());

        let registration_partners: { _id: ObjectId }[];
        [error, registration_partners] = await to(userModel.find({
            access: { "$in": [UserAccess.MEMBER, UserAccess.PARTNER] }
        }).select({
            _id: 1, access: 1
        }).catch());

        const result = registration_partners.map((a: { _id: ObjectId, access: UserAccess }) =>
            Object.assign({},
                {
                    user: a._id,
                    registration_partners: a.access,
                    registration_transactions: registration_transactions.find((b: { user: ObjectId }) => (b.user).toString() == (a._id).toString())?.type,
                    identify: !!registration_transactions.find((b: { user: ObjectId }) => (b.user).toString() == (a._id).toString())
                }
            )
        );

        response.status(200).send({
            data: {
                result: result,
                identify: `${result.filter((x) => x.identify === true).length} of ${result.length}`
            },
        });
    }

    private loyaltyIdentifier = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, points_transactions: { member: ObjectId, currentPoints: number }[];
        [error, points_transactions] = await to(loyaltyTransactionModel.aggregate([
            {
                $group: {
                    _id: "$member",
                    currentPoints: { $sum: '$points' }
                }
            }, {
                $project: {
                    "member": "$_id",
                    "currentPoints": "$currentPoints"
                }
            }]
        ).exec().catch());

        let points_loyalty: { member: ObjectId, currentPoints: number }[];
        [error, points_loyalty] = await to(loyaltyModel.find().select({
            member: 1, currentPoints: 1
        }).catch());

        const result = points_loyalty.map((a: { member: ObjectId, currentPoints: number }) =>
            Object.assign({},
                {
                    member: a.member,
                    points_loyalty: a.currentPoints,
                    points_transactions: points_transactions.find((b: { member: ObjectId, currentPoints: number }) => (b.member).toString() == (a.member).toString())?.currentPoints,
                    identify: points_transactions.find((b: { member: ObjectId, currentPoints: number }) => (b.member).toString() == (a.member).toString())?.currentPoints === a.currentPoints,
                }
            )
        );

        response.status(200).send({
            data: {
                result: result,
                identify: `${result.filter((x) => x.identify === true).length} of ${result.length}`
            },
        });
    }

    private microcreditIdentifier = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
        let error: Error, tokens_transactions: { support: ObjectId, currentTokens: number }[];
        [error, tokens_transactions] = await to(microcreditTransactionModel.aggregate([
            {
                $group: {
                    _id: "$support",
                    currentTokens: { $sum: '$tokens' }
                }
            }, {
                $project: {
                    "support": "$_id",
                    "currentTokens": "$currentTokens"
                }
            }]
        ).exec().catch());

        let tokens_microcredit: { _id: ObjectId, currentTokens: number }[];
        [error, tokens_microcredit] = await to(supportModel.find().select({
            _id: 1, currentTokens: 1
        }).catch());

        const result = tokens_microcredit.map((a: { _id: ObjectId, currentTokens: number }) =>
            Object.assign({},
                {
                    support: a._id,
                    tokens_microcredit: a.currentTokens,
                    tokens_transactions: tokens_transactions.find((b: { support: ObjectId, currentTokens: number }) => (b.support).toString() == (a._id).toString())?.currentTokens,
                    identify: tokens_transactions.find((b: { support: ObjectId, currentTokens: number }) => (b.support).toString() == (a._id).toString())?.currentTokens === a.currentTokens,
                }
            )
        );

        response.status(200).send({
            data: {
                result: result,
                identify: `${result.filter((x) => x.identify === true).length} of ${result.length}`
            },
            code: 200
        });
    }

    // private establishUsers = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //     if (`${process.env.RE_ESTABLISH_OPTION}` == 'true') {
    //         await this.registrationTransaction.deleteMany({});
    //         let error: Error, users: User[];
    //         [error, users] = await to(this.user.find({}).select({
    //             "_id": 1,
    //             "email": 1,
    //             "access": 1,
    //             "account": 1,
    //             "card": 1
    //         }).catch());
    //         if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    //         await Promise.all(users.map(async (user: User) => {
    //             // users.forEach(async (user: User) => {
    //             const encryptBy = (user.email) ? user.email : user.card;
    //             const account = serviceInstance.createWallet(encryptBy);
    //             const newAccount = serviceInstance.unlockWallet(account, encryptBy);
    //             if (user.access === 'member') {
    //                 await serviceInstance.getLoyaltyAppContract()
    //                     .then((instance) => {
    //                         return instance.methods['registerMember(address)'].sendTransaction(newAccount.address, serviceInstance.address)
    //                             .then(async (result: any) => {
    //                                 await this.registrationTransaction.create({
    //                                     ...result,
    //                                     user_id: user._id, type: "RegisterMember"
    //                                 });
    //                             })
    //                             .catch((error: Error) => {
    //                                 next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //                             })
    //                     })
    //                     .catch((error: Error) => {
    //                         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //                     })
    //                 await this.user.findOneAndUpdate({ _id: user._id }, {
    //                     $set: {
    //                         'account': account
    //                     }
    //                 });
    //             } else if (user.access === 'partner') {
    //                 await serviceInstance.getLoyaltyAppContract()
    //                     .then((instance) => {
    //                         return instance.registerPartner(newAccount.address, serviceInstance.address)
    //                             .then(async (result: any) => {
    //                                 await this.registrationTransaction.create({
    //                                     ...result,
    //                                     user_id: user._id, type: "RegisterPartner"
    //                                 });
    //                             })
    //                             .catch((error: Error) => {
    //                                 next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //                             })
    //                     })
    //                     .catch((error: Error) => {
    //                         next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
    //                     })
    //                 await this.user.findOneAndUpdate({ _id: user._id }, {
    //                     $set: {
    //                         'account': account
    //                     }
    //                 });
    //             }
    //         })
    //         );

    //         response.status(200).send({
    //             message: users.length + " accounts has been updated!",
    //             code: 200
    //         });
    //     } else {
    //         response.status(400).send('Cannot GET');
    //     }
    // }

    // private establishCampaigns = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //     if (`${process.env.RE_ESTABLISH_OPTION}` == 'true') {

    //         const randomDates = Math.floor(Math.random() * 10);

    //         if (randomDates < 4) {
    //             var _date_1 = new Date();
    //             var _newDate1 = _date_1.setDate(_date_1.getDate() - 10);
    //             var _date_2 = new Date();
    //             var _newDate2 = _date_2.setDate(_date_2.getDate() + 150);
    //             var _date_3 = new Date();
    //             var _newDate3 = _date_3.setDate(_date_3.getDate() - 5);
    //             var _date_4 = new Date();
    //             var _newDate4 = _date_4.setDate(_date_4.getDate() + 300);
    //         } else if (randomDates >= 4 && randomDates < 7) {
    //             var _date_1 = new Date();
    //             var _newDate1 = _date_1.setDate(_date_1.getDate() + 5);
    //             var _date_2 = new Date();
    //             var _newDate2 = _date_2.setDate(_date_2.getDate() + 150);
    //             var _date_3 = new Date();
    //             var _newDate3 = _date_3.setDate(_date_3.getDate() + 151);
    //             var _date_4 = new Date();
    //             var _newDate4 = _date_4.setDate(_date_4.getDate() + 300);
    //         } else {
    //             var _date_1 = new Date();
    //             var _newDate1 = _date_1.setDate(_date_1.getDate() - 1);
    //             var _date_2 = new Date();
    //             var _newDate2 = _date_2.setDate(_date_2.getDate() + 150);
    //             var _date_3 = new Date();
    //             var _newDate3 = _date_3.setDate(_date_3.getDate() + 10);
    //             var _date_4 = new Date();
    //             var _newDate4 = _date_4.setDate(_date_4.getDate() + 300);
    //         }

    //         let error: Error, campaigns: MicrocreditCampaign[];
    //         [error, campaigns] = await to(microcreditModel.find(
    //             { status: 'published' }
    //         )
    //             .populate([{
    //                 path: 'partner'
    //             }])
    //             .catch());

    //         // [error, campaigns] = await to(this.user.aggregate([{
    //         //     $unwind: '$microcredit'
    //         // }, {
    //         //     $match: {
    //         //         'microcredit.status': 'published'
    //         //     }
    //         // }, {
    //         //     $project: {
    //         //         _id: false,
    //         //         partner_id: '$_id',
    //         //         partner_account: '$account',
    //         //         campaign_id: '$microcredit._id',

    //         //         quantitative: '$microcredit.quantitative',
    //         //         stepAmount: '$microcredit.stepAmount',
    //         //         minAllowed: '$microcredit.minAllowed',
    //         //         maxAllowed: '$microcredit.maxAllowed',
    //         //         maxAmount: '$microcredit.maxAmount',

    //         //         redeemStarts: '$microcredit.redeemStarts',
    //         //         redeemEnds: '$microcredit.redeemEnds',
    //         //         startsAt: '$microcredit.startsAt',
    //         //         expiresAt: '$microcredit.expiresAt',
    //         //     }
    //         // }
    //         // ]).exec().catch());
    //         if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    //         await Promise.all(campaigns.map(async (campaign: any) => {
    //             // campaigns.forEach(async (campaign: any) => {
    //             const dates = {
    //                 startsAt: _newDate1.toString(), //(campaign.startsAt).toString(),
    //                 expiresAt: _newDate2.toString(), //(campaign.expiresAt).toString(),
    //                 redeemStarts: _newDate3.toString(), //(campaign.redeemStarts).toString(),
    //                 redeemEnds: _newDate4.toString(), //(campaign.redeemEnds).toString()
    //             };

    //             Object.keys(dates).forEach((key: string) => {
    //                 if (`${process.env.PRODUCTION}` == 'true')
    //                     (dates as any)[key] = (dates as any)[key] + "000000";
    //                 else
    //                     (dates as any)[key] = ((dates as any)[key]).substring(0, ((dates as any)[key]).length - 3);
    //             });

    //             await serviceInstance.startNewMicrocredit(campaign.partner.account.address,
    //                 1, campaign.maxAmount, campaign.maxAmount, campaign.minAllowed,
    //                 parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
    //                 campaign.quantitative)
    //                 .then(async (result: any) => {

    //                     await microcreditModel.updateOne({
    //                         '_id': campaign._id
    //                     }, {
    //                         '$set': {
    //                             'status': 'published', // published
    //                             'address': result.address,
    //                             'transactionHash': result.transactionHash,
    //                             'startsAt': _newDate1,
    //                             'expiresAt': _newDate2,
    //                             'redeemStarts': _newDate3,
    //                             'redeemEnds': _newDate4,
    //                         }
    //                     });
    //                     // await this.user.updateOne({
    //                     //     _id: campaign.partner._id,
    //                     //     'microcredit._id': campaign._id
    //                     // }, {
    //                     //     '$set': {
    //                     //         'microcredit.$.status': 'published', // published
    //                     //         'microcredit.$.address': result.address,
    //                     //         'microcredit.$.transactionHash': result.transactionHash,
    //                     //         'microcredit.$.startsAt': _newDate1,
    //                     //         'microcredit.$.expiresAt': _newDate2,
    //                     //         'microcredit.$.redeemStarts': _newDate3,
    //                     //         'microcredit.$.redeemEnds': _newDate4,
    //                     //     }
    //                     // });
    //                 })
    //                 .catch((error: Error) => {
    //                     next(new UnprocessableEntityException(error.message))
    //                 })
    //         })
    //         );

    //         response.status(200).send({
    //             message: campaigns.length + " campaigns has been updated!",
    //             code: 200
    //         });
    //     } else {
    //         response.status(400).send('Cannot GET');
    //     }
    // }

    // private removeLoyaltyHistory = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //     if (`${process.env.RE_ESTABLISH_OPTION}` == 'true') {

    //         await this.loyaltyTransaction.deleteMany({});

    //         response.status(200).send({
    //             message: 'Loyalty History Deleted',
    //             code: 200
    //         });
    //     } else {
    //         response.status(400).send('Cannot GET');
    //     }
    // }

    // private removeMicrocreditHistory = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    //     if (`${process.env.RE_ESTABLISH_OPTION}` == 'true') {
    //         await this.microcreditTransaction.deleteMany({});

    //         let error: Error, campaigns: MicrocreditCampaign[];
    //         [error, campaigns] = await to(microcreditModel.find(
    //             { status: 'published' }
    //         )
    //             .populate([{
    //                 path: 'partner'
    //             }])
    //             .catch());
    //         // [error, campaigns] = await to(this.user.aggregate([{
    //         //     $unwind: '$microcredit'
    //         // }, {
    //         //     $match: {
    //         //         'microcredit.status': 'published'
    //         //     }
    //         // }, {
    //         //     $project: {
    //         //         _id: false,
    //         //         partner_id: '$_id',
    //         //         campaign_id: '$microcredit._id',

    //         //         quantitative: '$microcredit.quantitative',
    //         //         stepAmount: '$microcredit.stepAmount',
    //         //         minAllowed: '$microcredit.minAllowed',
    //         //         maxAllowed: '$microcredit.maxAllowed',
    //         //         maxAmount: '$microcredit.maxAmount',

    //         //         redeemStarts: '$microcredit.redeemStarts',
    //         //         redeemEnds: '$microcredit.redeemEnds',
    //         //         startsAt: '$microcredit.startsAt',
    //         //         expiresAt: '$microcredit.expiresAt',
    //         //     }
    //         // }
    //         // ]).exec().catch());
    //         if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    //         campaigns.forEach(async (campaign: MicrocreditCampaign) => {
    //             let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    //             [error, results] = await to(microcreditModel.updateOne(
    //                 {
    //                     '_id': campaign._id
    //                 }, {
    //                 '$set': {
    //                     '_id': campaign._id,
    //                     'supports': []
    //                 }
    //             }).catch());
    //             // [error, results] = await to(this.user.updateOne(
    //             //     {
    //             //         _id: (campaign.partner as Partner)._id,
    //             //         'microcredit._id': campaign._id
    //             //     }, {
    //             //     '$set': {
    //             //         'microcredit.$._id': campaign._id,
    //             //         'microcredit.$.supports': []
    //             //     }
    //             // }).catch());
    //             if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    //         })

    //         response.status(200).send({
    //             message: 'Microcredit History Deleted',
    //             code: 200
    //         });
    //     } else {
    //         response.status(400).send('Cannot GET');
    //     }
    // }
}

export default ReEstablishController;
