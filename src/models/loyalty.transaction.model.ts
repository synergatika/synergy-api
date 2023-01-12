import * as mongoose from 'mongoose';
import { LoyaltyTransaction } from '../_interfaces/index';
import { Schema } from 'mongoose';

// const dataSchema = new mongoose.Schema({
//   partner_name: String,
//   partner_email: String,
//
//   points: Number,
//   amount: {
//     type: Number,
//     default: -1
//   },
//   offer_id: {
//     type: String,
//     default: '-1'
//   },
//   offer_title: {
//     type: String,
//     default: null
//   },
//   quantity: {
//     type: Number,
//     default: 0
//   }
// }, { _id: false });

// const infoSchema = new mongoose.Schema({
//   from_name: String,
//   from_email: String,
//   to_email: String,
//   points: Number,
//   amount: Number
// }, { _id: false });

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

  partner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  offer: {
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  partner_id: String,
  partner_name: String,

  member_id: String,

  offer_id: {
    type: String,
    default: '-1'
  },
  offer_title: {
    type: String,
    default: null
  },

  points: Number,
  amount: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  // from_id: String,
  // to_id: String,

  // info: infoSchema,
  // data: dataSchema,

  tx: String,
  receipt: receiptSchema,
  logs: Array,
  type: {
    type: String,
    enum: ['EarnPoints', 'RedeemPoints', 'RedeemPointsOffer'],
  },
}, {
  timestamps: true
});

const loyaltyTransactionModel = mongoose.model<LoyaltyTransaction & mongoose.Document>('LoyaltyTransaction', loyaltyTransactionSchema);
export default loyaltyTransactionModel;
