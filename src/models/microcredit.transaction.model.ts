import * as mongoose from 'mongoose';
import MicrocreditTransaction from '../microcreditInterfaces/transaction.interface';
import { object, string } from 'prop-types';

const logsSchema = new mongoose.Schema({
  logIndex: Number,
  transactionIndex: Number,
  transactionHash: String,
  blockHash: String,
  blockNumber: Number,
  address: String,
  type: String,
  id: String,
  event: String,
  args: Array
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

const microcreditTransactionSchema = new mongoose.Schema({

  data: {
    user_id: String,
    campaign_id: String,
    support_id: String
  },

  tx: String,
  receipt: receiptSchema,
  logs: [logsSchema],
  type: {
    type: String,
    enum: ['PromiseFund', 'ReceiveFund', 'SpendFund'],
  },
}, {
    timestamps: true
  });

const microcreditTransactionModel = mongoose.model<MicrocreditTransaction & mongoose.Document>('MicrocreditTransaction', microcreditTransactionSchema);
export default microcreditTransactionModel;
