import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { MicrocreditSupport, SupportPayment, SupportStatus } from '../_interfaces/index';

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
  status: {
    type: String,
    enum: ['completed', 'paid', 'unpaid'],
    default: 'unpaid'
  },
  payment: paymentSchema,

  /** Blockchain Variables */
  contractRef: String,
  contractIndex: String
  /** ----- */
}, { timestamps: true });

const supportModel = mongoose.model<MicrocreditSupport & mongoose.Document>('MicrocreditSupport', supportSchema);
export default supportModel;