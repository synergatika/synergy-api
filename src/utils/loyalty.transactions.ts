import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');
import { ObjectId } from 'mongodb';

/**
 * Blockchain Util
 */
import BlockchainRegistrationService from './blockchain.util';
const registrationService = new BlockchainRegistrationService();

/**
 * DTOs
 */
import { EarnPointsDto, RedeemPointsDto } from '../_dtos/index';

/**
 * Interfaces
 */
import { User, Partner, Member, LoyaltyOffer, LoyaltyTransaction, LoyaltyTransactionType, TransactionStatus } from '../_interfaces/index';

/**
 * Models
 */
import transactionModel from '../models/loyalty.transaction.model';

export default class LoyaltyTransactionsUtil {
    private isError = (err: unknown): err is Error => err instanceof Error;

    public readOfferTransactions = async (_offer: LoyaltyOffer, _date: string, _paging: { page: string, size: string }) => {
        const offer: LoyaltyOffer = _offer;

        /** Filters */
        var d = new Date(_date).setHours(0, 0, 0, 0);
        var min = (_date != '0') ? (new Date(d)).setDate((new Date(d)).getDate()) : new Date('2020-01-01');
        var max = (_date != '0') ? (new Date(d)).setDate((new Date(d)).getDate() + 1) : (new Date()).setDate((new Date).getDate() + 1);
        /** ***** * ***** */

        return await transactionModel.find({
            "$and": [
                { "offer": offer._id },
                { "createdAt": { "$lt": new Date(max), "$gt": new Date(min) } }
            ]
        }).populate([
            { "path": 'partner' },
            { "path": 'member' },
            { "path": 'offer' }
        ])
            .sort({ "createdAt": 1 })
            .limit(parseInt(_paging['size'] as string))
            .skip((parseInt(_paging['page'] as string) - 1) * parseInt(_paging['size'] as string));
    }

    public readLoyaltyTransactions = async (_user: User, _types: LoyaltyTransactionType[], _date: string, _paging: { page: string, size: string }) => {
        const user: User = _user;

        /** Filters */
        var d = new Date(_date).setHours(0, 0, 0, 0);
        var min = (_date != '0') ? (new Date(d)).setDate((new Date(d)).getDate()) : new Date('2020-01-01');
        var max = (_date != '0') ? (new Date(d)).setDate((new Date(d)).getDate() + 1) : (new Date()).setDate((new Date).getDate() + 1);
        /** ***** * ***** */

        return await transactionModel.find({
            "$and": [
                {
                    "$or": [{ "partner": user._id }, { "member": user._id }]
                },
                { "type": { "$in": [..._types] } },
                { "createdAt": { "$lt": new Date(max), "$gt": new Date(min) } }
            ]
        }).populate([
            { "path": 'partner' },
            { "path": 'member' }
        ])
            .sort({ "createdAt": -1 })
            .limit(parseInt(_paging['size'] as string))
            .skip((parseInt(_paging['page'] as string) - 1) * parseInt(_paging['size'] as string));
    }

    public createEarnTransaction = async (partner: User, member: User, data: EarnPointsDto, _points: number) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerEarnLoyalty(partner, member, _points).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        return await transactionModel.create({
            ...blockchain_result,

            partner: partner,
            member: member,

            points: _points,
            amount: data._amount,

            /** begin: To be Removed in Next Version */
            partner_id: partner._id,
            partner_name: partner.name,
            member_id: member._id,
            /** end: To be Removed in Next Version */

            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
            type: LoyaltyTransactionType.EarnPoints,
        })
    }

    public createRedeemTransaction = async (partner: User, member: User, offer: LoyaltyOffer, data: RedeemPointsDto, _points: number) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerRedeemLoyalty(partner, member, _points).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        return await transactionModel.create({
            partner: partner,
            member: member,
            offer: offer,

            points: _points * (-1),
            amount: (data._amount) ? (data._amount) * (-1) : 0,
            quantity: data.quantity,

            ...blockchain_result,

            /** begin: To be Removed in Next Version */
            partner_id: partner._id,
            partner_name: partner.name,
            member_id: member._id,
            offer_id: (offer) ? offer._id : null,
            offer_title: (offer) ? offer.title : null,
            /** end: To be Removed in Next Version */

            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
            type: (offer) ? LoyaltyTransactionType.RedeemPointsOffer : LoyaltyTransactionType.RedeemPoints,
        })
    }

    public updateLoyaltyTransaction = async (_transaction: LoyaltyTransaction) => {

        let blockchain_error: Error, blockchain_result: any;

        if (_transaction.type === LoyaltyTransactionType.EarnPoints) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerEarnLoyalty(_transaction.partner as Partner, _transaction.member as Member, _transaction.points).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        } else if ((_transaction.type === LoyaltyTransactionType.RedeemPoints) || (_transaction.type === LoyaltyTransactionType.RedeemPointsOffer)) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerRedeemLoyalty(_transaction.partner as Partner, _transaction.member as Member, _transaction.points * (-1)).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        }

        if (blockchain_result) {
            let error: Error, transaction: LoyaltyTransaction;
            [error, transaction] = await to(transactionModel.updateOne({
                "_id": _transaction._id
            }, {
                "$set": {
                    ...blockchain_result,
                    "status": (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING
                }
            }, { new: true }).catch());

            return transaction;
        }

        return null;
    }
}