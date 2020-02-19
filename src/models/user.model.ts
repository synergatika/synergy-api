import * as mongoose from 'mongoose';
import User from '../usersInterfaces/user.interface';
import { object } from 'prop-types';

const microcreditSupportSchema = new mongoose.Schema({
  backer_id: String,
  initialTokens: Number,
  redeemedTokens: Number,
  status: {
    type: String,
    enum: ['order', 'confirmation', 'complete'],
    default: 'order'
  },
  method: String,
  contractIndex: Number,
  contractRef: String
}, { timestamps: true });

const microcreditCampaignSchema = new mongoose.Schema({
  title: String,
  terms: String,
  description: String,
  category: String,
  imageURL: String,
  access: String,

  quantitative: Boolean,
  minAllowed: Number,
  maxAllowed: Number,
  maxAmount: Number,

  redeemStarts: Number,
  redeemEnds: Number,
  startsAt: Number,
  expiresAt: Number,

  address: String,
  transactionHash: String,

  supports: [microcreditSupportSchema]
}, { timestamps: true });

const offerSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageURL: String,
  cost: Number,
  expiresAt: Number
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageURL: String,
  access: {
    type: String,
    enum: ['public', 'private', 'partners'],
    default: 'public'
  },
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageURL: String,
  access: {
    type: String,
    enum: ['public', 'private', 'partners'],
    default: 'public'
  },
  location: String,
  dateTime: String
}, { timestamps: true });

const addressSchema = new mongoose.Schema({
  street: String,
  postCode: String,
  city: String,
  coordinates: [String]
}, { _id: false });

const contactSchema = new mongoose.Schema({
  phone: String,
  websiteURL: String
}, { _id: false });

const paymentsSchema = new mongoose.Schema({
  nationalBank: String,
  piraeusBank: String,
  eurobank: String,
  alphaBank: String,
  paypal: String
}, { _id: false });

const authSchema = new mongoose.Schema({
  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  card: String,
  password: String,
  imageURL: String,

  account: {
    type: Object,
    // required: true
  },

  access: {
    type: String,
    enum: ['customer', 'merchant', 'admin'],
    default: 'customer'
  },
  sector: {
    type: String,
    enum: ['None', 'B2B Services & Other Goods and Services', 'Durables', 'Durables (Technology)', 'Education', 'Food', 'Hotels, cafes and restaurants', 'Recreation and Culture'],
    default: 'None'
  },

  contact: contactSchema,
  address: addressSchema,
  payments: paymentsSchema,

  email_verified: Boolean,
  pass_verified: Boolean,

  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number,
  // auth: authSchema,
  offers: [offerSchema],
  posts: [postSchema],
  events: [eventSchema],
  microcredit: [microcreditCampaignSchema],
  previousAccounts: [Object],
  createdBy: {
    type: String,
    default: 'itself'
  }
}, {
  timestamps: true
});

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);
export default userModel;
