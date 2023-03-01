import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { MicrocreditSupport, MicrocreditSupportPayment, MicrocreditSupportStatus } from '../_interfaces/index';

const paymentSchema = new mongoose.Schema({
  _id: String,
  method: {
    bic: String,
    name: String,
    value: String
  }
}, { _id: false });

const supportSchema = new mongoose.Schema({
  member: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Microcredit'
  },

  initialTokens: Number,
  currentTokens: Number,
  payment: paymentSchema,
  status: {
    type: MicrocreditSupportStatus,
    enum: ['completed', 'paid', 'unpaid'],
    default: MicrocreditSupportStatus.UNPAID
  },

  /** Blockchain Variables */
  contractRef: String,
  contractIndex: {
    type: Number,
    default: -1
  }

}, { timestamps: true });

const supportModel = mongoose.model<MicrocreditSupport & mongoose.Document>('MicrocreditSupport', supportSchema);
export default supportModel;