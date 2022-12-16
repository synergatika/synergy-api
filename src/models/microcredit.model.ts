import * as mongoose from 'mongoose';
import { MicrocreditCampaign } from '../_interfaces/index';

const Schema = mongoose.Schema;

const microcreditSchema = new mongoose.Schema({
  partner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  title: String,
  subtitle: String,
  slug: String,
  terms: String,
  description: String,
  contentFiles: [String],

  category: String,
  imageURL: String,
  access: String,

  quantitative: Boolean,
  redeemable: {
    type: Boolean,
    default: true
  },
  stepAmount: Number,
  minAllowed: Number,
  maxAllowed: Number,
  maxAmount: Number,

  redeemStarts: Number,
  redeemEnds: Number,
  startsAt: Number,
  expiresAt: Number,

  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },

  address: String,
  transactionHash: String,

  //  supports: [microcreditSupportSchema]
}, { timestamps: true });


const microcreditModel = mongoose.model<MicrocreditCampaign & mongoose.Document>('Microcredit', microcreditSchema);

export default microcreditModel;
