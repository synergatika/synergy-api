import MicrocreditSupportsController from 'controllers/microcredit_supports.controller';
import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { EarnTokensDto, RedeemTokensDto } from '_dtos';
import { MicrocreditTransaction, TransactionStatus } from '../_interfaces/index';

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
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'MicrocreditCampaign'
  },
  support: {
    type: Schema.Types.ObjectId,
    ref: 'MicrocreditSupport'
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  tokens: {
    type: Number,
    default: 0
  },

  // support_id: String,

  // partner_id: String,
  // partner_name: String,

  // member_id: String,

  // campaign_id: String,
  // campaign_title: String,
  // address: String,

  // method: String,
  // payment_id: String,

  // tokens: {
  //   type: Number,
  //   default: 0
  // },

  // payoff: {
  //   type: Number,
  //   default: 0
  // },

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

  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const microcreditTransactionModel = mongoose.model<MicrocreditTransaction & mongoose.Document>('MicrocreditTransaction', microcreditTransactionSchema);
export default microcreditTransactionModel;
