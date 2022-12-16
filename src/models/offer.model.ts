import * as mongoose from 'mongoose';
import { LoyaltyOffer } from '../_interfaces/index';

const Schema = mongoose.Schema;

const offerSchema = new mongoose.Schema({
  partner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  title: String,
  subtitle: String,
  slug: String,
  description: String,
  imageURL: String,
  cost: Number,
  instructions: String,
  expiresAt: Number
}, { timestamps: true });

const offerModel = mongoose.model<LoyaltyOffer & mongoose.Document>('Offer', offerSchema);

export default offerModel;