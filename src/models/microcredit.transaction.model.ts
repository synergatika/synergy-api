import * as mongoose from 'mongoose';
import MicrocreditTransaction from '../microcreditInterfaces/transaction.interface';

// const dataSchema = new mongoose.Schema({
//   campaign_id: String,
//   campaign_title: String,
//   address: String,
//   support_id: String,
//   contractIndex: {
//     type: Number,
//     default: -1
//   },
//   tokens: {
//     type: Number,
//     default: -1
//   },
// }, { _id: false });

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
  support_id: String,

  partner_id: String,
  partner_name: String,

  member_id: String,

  campaign_id: String,
  campaign_title: String,
  address: String,

  method: String,
  payment_id: String,
  tokens: {
    type: Number,
    default: 0
  },

  contractRef: String,
  contractIndex: {
    type: Number,
    default: -1
  },
  // data: dataSchema,

  tx: String,
  receipt: receiptSchema,
  logs: [logsSchema],
  type: {
    type: String,
    enum: ['PromiseFund', 'ReceiveFund', 'RevertFund', 'SpendFund'],
  },
}, {
    timestamps: true
  });

const microcreditTransactionModel = mongoose.model<MicrocreditTransaction & mongoose.Document>('MicrocreditTransaction', microcreditTransactionSchema);
export default microcreditTransactionModel;
