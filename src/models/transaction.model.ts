import * as mongoose from 'mongoose';
import Transaction from '../loyaltyInterfaces/transaction.interface';
import { object, string } from 'prop-types';

const receiptSchema = new mongoose.Schema({
    transactionHash: String,
    transactionIndex: Number,
    blockHash: String,
    blockNumber: Number,
    from: String,
    to: String,
    gasUsed: Number,
    cumulativeGasUsed: Number,
    contractAddress: String,
    logs: Array,
    status: Boolean,
    logsBloom: String,
    v: String,
    r: String,
    s: String,
    rawLogs: Array
}, { _id: false });

const transactionSchema = new mongoose.Schema({
    _from_name: String,
    _from_email: String,
    _to_email: String,
    _points: Number,
    tx: String,
    receipt: receiptSchema,
    logs: Array,
    type: {
        type: String,
        enum: ['RegisterMember', 'RegisterPartner', 'RecoverPoints', 'EarnPoints', 'RedeemPoints'],
    },
}, {
    timestamps: true
});

const transactionModel = mongoose.model<Transaction & mongoose.Document>('Transaction', transactionSchema);

export default transactionModel;
