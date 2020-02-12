import * as mongoose from 'mongoose';
import LoyaltyTransaction from '../loyaltyInterfaces/transaction.interface';
import { object, string } from 'prop-types';

const infoSchema = new mongoose.Schema({
  from_name: String,
  from_email: String,
  to_email: String,
  points: Number
}, { _id: false });

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

const loyaltyTransactionSchema = new mongoose.Schema({

  from_id: String,
  to_id: String,

  info: infoSchema,

  tx: String,
  receipt: receiptSchema,
  logs: Array,
  type: {
    type: String,
    enum: ['EarnPoints', 'RedeemPoints'],
  },
}, {
    timestamps: true
  });

const loyaltyTransactionModel = mongoose.model<LoyaltyTransaction & mongoose.Document>('LoyaltyTransaction', loyaltyTransactionSchema);
export default loyaltyTransactionModel;
