import * as mongoose from 'mongoose';
import RegistrationTransaction from '../authInterfaces/transaction.interface';
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

const registrationTransactionSchema = new mongoose.Schema({

  data: {
    user_id: String
  },

  tx: String,
  receipt: receiptSchema,
  logs: Array,
  type: {
    type: String,
    enum: ['RegisterMember', 'RegisterPartner', 'RecoverPoints'],
  },
}, {
    timestamps: true
  });

const registrationTransactionModel = mongoose.model<RegistrationTransaction & mongoose.Document>('RegistrationTransaction', registrationTransactionSchema);
export default registrationTransactionModel;
