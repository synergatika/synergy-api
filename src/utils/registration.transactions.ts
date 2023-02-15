import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Blockchain Service / Util
 */
import { BlockchainService } from '../services/blockchain.service';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

import BlockchainRegistrationService from './blockchain.util';
const registrationService = new BlockchainRegistrationService();

/**
 * Interfaces
 */
import { User, Account, RegistrationTransaction, RegistrationTransactionType, TransactionStatus } from '../_interfaces/index';

/**
 * Models
 */
import transactionModel from '../models/registration.transaction.model';

export default class RegistrationTransactionsUtil {

    private isError = (err: unknown): err is Error => err instanceof Error;

    public createRegisterMemberTransaction = async (user: User, encryptBy: string) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerMemberAccount(user.account).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: RegistrationTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            ...blockchain_result,
            user: user,
            user_id: user._id,
            encryptBy: encryptBy,
            type: RegistrationTransactionType.RegisterMember,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        })
        // .catch());
    }

    public createRegisterPartnerTransaction = async (user: User, encryptBy: string) => {
        let blockchain_error: Error, blockchain_result: any;
        [blockchain_error, blockchain_result] = await to(registrationService.registerPartnerAccount(user.account).catch());
        if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

        // let error: Error, transaction: RegistrationTransaction;
        // [error, transaction] = await to(
        return await transactionModel.create({
            ...blockchain_result,
            user: user,
            user_id: user._id,
            encryptBy: encryptBy,
            type: RegistrationTransactionType.RegisterPartner,
            status: (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        })
        // .catch());
    }

    public updateRegistrationTransaction = async (_transaction: RegistrationTransaction) => {
        const user: User = _transaction.user;
        if (!user) return;

        const newAccount: Account = serviceInstance.unlockWallet(user.account, (user.email) ? user.email : user.card);

        let blockchain_error: Error, blockchain_result: any;
        if (_transaction.type === RegistrationTransactionType.RegisterMember) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerMemberAccount(newAccount).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        } else if (_transaction.type === RegistrationTransactionType.RegisterPartner) {
            [blockchain_error, blockchain_result] = await to(registrationService.registerPartnerAccount(newAccount).catch());
            if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;
        }
        if (blockchain_result) {
            let error: Error, transaction: RegistrationTransaction;
            [error, transaction] = await to(transactionModel.updateOne({
                '_id': new ObjectId(_transaction._id)
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

