import * as mongoose from 'mongoose';
import { ItemAccess, MicrocreditCampaign, MicrocreditCampaignStatus, TransactionStatus } from '../_interfaces/index';

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

  access: {
    type: ItemAccess,
    enum: ['public', 'private', 'partners'],
    default: ItemAccess.PUBLIC
  },

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
    type: TransactionStatus,
    enum: ['pending', 'completed'],
    default: TransactionStatus.PENDING
  },
  status: {
    type: MicrocreditCampaignStatus,
    enum: ['draft', 'published'],
    default: MicrocreditCampaignStatus.DRAFT
  },

  published: {
    type: Boolean,
    default: true
  },

  /** Blckchain Variables */
  address: String,
  transactionHash: String

}, { timestamps: true });


const microcreditCampaignModel = mongoose.model<MicrocreditCampaign & mongoose.Document>('Microcredit', microcreditCampaignSchema);

export default microcreditCampaignModel;
