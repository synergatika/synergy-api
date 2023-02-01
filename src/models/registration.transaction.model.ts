import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { RegistrationTransaction } from '../_interfaces/index';

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

const registrationTransactionSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  user_id: String,

  tx: String,
  receipt: receiptSchema,
  logs: Array,
  type: {
    type: String,
    enum: ['RegisterMember', 'RegisterPartner', 'RecoverPoints'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const registrationTransactionModel = mongoose.model<RegistrationTransaction & mongoose.Document>('RegistrationTransaction', registrationTransactionSchema);
export default registrationTransactionModel;
