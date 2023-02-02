import * as mongoose from 'mongoose';
import { MicrocreditCampaign, TransactionStatus } from '../_interfaces/index';

const Schema = mongoose.Schema;

const microcreditCampaignSchema = new mongoose.Schema({
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

  registered: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },

  address: String,
  transactionHash: String

  //  supports: [microcreditSupportSchema]
}, { timestamps: true });


const microcreditCampaignModel = mongoose.model<MicrocreditCampaign & mongoose.Document>('Microcredit', microcreditCampaignSchema);

export default microcreditCampaignModel;
