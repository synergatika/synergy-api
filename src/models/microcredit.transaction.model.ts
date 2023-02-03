import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { MicrocreditTransaction } from '../_interfaces/index';

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

  support: {
    type: Schema.Types.ObjectId,
    ref: 'MicrocreditSupport'
  },

  data: Object,

  tokens: {
    type: Number,
    default: 0
  },
  payoff: {
    type: Number,
    default: 0
  },

  /** begin: To be Removed in Next Version */
  support_id: String,
  partner_id: String,
  partner_name: String,
  member_id: String,
  campaign_id: String,
  campaign_title: String,
  /** end: To be Removed in Next Version */

  type: {
    type: String,
    enum: ['PromiseFund', 'ReceiveFund', 'RevertFund', 'SpendFund'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },

  /** Blockchain Variables (Optional) */
  tx: String,
  receipt: receiptSchema,
  logs: [logsSchema]

}, {
  timestamps: true
});

const microcreditTransactionModel = mongoose.model<MicrocreditTransaction & mongoose.Document>('MicrocreditTransaction', microcreditTransactionSchema);
export default microcreditTransactionModel;
