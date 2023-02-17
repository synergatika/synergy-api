

import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var path = require('path');

/**
 * Blockchain Util
 */
import BlockchainRegistrationService from './blockchain.util';
const registrationService = new BlockchainRegistrationService();

/**
 * DTOs
 */
import { EarnTokensDto, RedeemTokensDto } from '../_dtos/index';

/**
 * Interfaces
 */
import { User, Partner, Member, MicrocreditCampaign, MicrocreditSupport, MicrocreditTransaction, MicrocreditTransactionType, TransactionStatus } from '../_interfaces/index';

/**
 * Models
 */
import transactionModel from '../models/microcredit.transaction.model';

class MicrocreditTransactionsUtil {
    private isError = (err: unknown): err is Error => err instanceof Error;

    public createPromiseTransaction = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto, support_id: MicrocreditSupport['_id']) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerPromisedFund(campaign, member, data._amount).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: MicrocreditTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            support: support_id,

            ...blockchain_result,

            // data: data,
            tokens: data._amount,

            type: MicrocreditTransactionType.PromiseFund,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

            /** begin: To be Removed in Next Version */
            member_id: (member as Member)._id,
            campaign_id: campaign._id,
            campaign_title: campaign.title,
            support_id: support_id,
            partner_id: (campaign.partner as Partner)._id,
            partner_name: (campaign.partner as Partner).name,
            /** end: To be Removed in Next Version */
        })
        // .catch());
        // if (error) return error;

        // return blockchain_result;
    }

    public createReceiveTransaction = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerReceivedFund(campaign, support).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: MicrocreditTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            support: support._id,

            ...blockchain_result,

            payoff: support.initialTokens,

            type: MicrocreditTransactionType.ReceiveFund,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

            /** begin: To be Removed in Next Version */
            member_id: (support.member as Member)._id,
            campaign_id: campaign._id,
            campaign_title: campaign.title,
            support_id: support._id,
            partner_id: (campaign.partner as Partner)._id,
            partner_name: (campaign.partner as Partner).name
            /** end: To be Removed in Next Version */

        })
        // .catch());
        // if (error) return error;

        // return blockchain_result;
    }

    public createRevertTransaction = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerRevertFund(campaign, support).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: MicrocreditTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            support: support._id,

            ...blockchain_result,

            type: MicrocreditTransactionType.RevertFund,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

            /** begin: To be Removed in Next Version */
            member_id: (support.member as Member)._id,
            campaign_id: campaign._id,
            campaign_title: campaign.title,
            support_id: support._id,
            partner_id: (campaign.partner as Partner)._id,
            partner_name: (campaign.partner as Partner).name,
            /** end: To be Removed in Next Version */

            tokens: 0,
            payoff: support.initialTokens * (-1)
        })
        // .catch());
        // if (error) return error;

        // return blockchain_result;
    }

    public createSpendTransaction = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto, support: MicrocreditSupport) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerSpentFund(campaign, member, data._tokens).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: MicrocreditTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            support: support._id,

            ...blockchain_result,

            // data: data,
            tokens: data._tokens * (-1),

            type: MicrocreditTransactionType.SpendFund,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,

            /** begin: To be Removed in Next Version */
            member_id: (support.member as Member)._id,
            campaign_id: campaign._id,
            campaign_title: campaign.title,
            support_id: support._id,
            partner_id: (campaign.partner as Partner)._id,
            partner_name: (campaign.partner as Partner).name
            /** end: To be Removed in Next Version */
        })
        // .catch());
        // if (error) return error;

        // return blockchain_result;
    }

    public updateMicrocreditTransaction = async (_transaction: MicrocreditTransaction) => {
        let blockchain_error: Error, blockchain_result: any;

        if (_transaction.type === MicrocreditTransactionType.PromiseFund) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerPromisedFund((_transaction.support as MicrocreditSupport).campaign as MicrocreditCampaign, (_transaction.support as MicrocreditSupport).member as Member, _transaction.tokens).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

            if (blockchain_result) {
                let error: Error, support: MicrocreditSupport;
                [error, support] = await to(transactionModel.updateOne({
                    _id: (_transaction.support as MicrocreditSupport)._id
                }, {
                    "$set": {
                        "contractRef": blockchain_result?.logs[0].args.ref,
                        "contractIndex": blockchain_result?.logs[0].args.index,
                    }
                }).catch());
                if (error) return null;
            }
        }
        else if (_transaction.type === MicrocreditTransactionType.ReceiveFund) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerReceivedFund((_transaction.support as MicrocreditSupport).campaign as MicrocreditCampaign, _transaction.support as MicrocreditSupport).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        }
        else if (_transaction.type === MicrocreditTransactionType.RevertFund) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerRevertFund((_transaction.support as MicrocreditSupport).campaign as MicrocreditCampaign, _transaction.support as MicrocreditSupport).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        }
        else if (_transaction.type === MicrocreditTransactionType.SpendFund) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerSpentFund((_transaction.support as MicrocreditSupport).campaign as MicrocreditCampaign, (_transaction.support as MicrocreditSupport).member as Member, _transaction.tokens * (-1)).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        }

        if (blockchain_result) {
            let error: Error, transaction: MicrocreditTransaction;
            [error, transaction] = await to(transactionModel.updateOne({
                '_id': _transaction._id
            }, {
                '$set': {
                    ...blockchain_result,
                    status: (blockchain_result) ? TransactionStatus.COMPLETED : TransactionStatus.PENDING
                }
            }, { new: true }).catch());

            return transaction;
        }

        return null;
    }
}
export default MicrocreditTransactionsUtil;