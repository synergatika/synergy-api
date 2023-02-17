import * as mongoose from 'mongoose';
import { User, UserAccess } from '../_interfaces/index';

// const microcreditSupportSchema = new mongoose.Schema({
//   backer_id: String,
//   payment_id: String,
//   initialTokens: Number,
//   redeemedTokens: Number,
//   status: {
//     type: String,
//     enum: ['order', 'confirmation', 'complete'],
//     default: 'order'
//   },
//   method: {
//     type: String,
//     // enum: ['nationalBank', 'pireausBank', 'eurobank', 'alphaBank', 'paypal', 'store'],
//     default: 'store'
//   },
//   contractIndex: Number,
//   contractRef: String
// }, { timestamps: true });

// const microcreditCampaignSchema = new mongoose.Schema({
//   title: String,
//   subtitle: String,
//   slug: String,
//   terms: String,
//   description: String,
//   contentFiles: [String],

//   category: String,
//   imageURL: String,
//   access: String,

//   quantitative: Boolean,
//   redeemable: {
//     type: Boolean,
//     default: true
//   },
//   stepAmount: Number,
//   minAllowed: Number,
//   maxAllowed: Number,
//   maxAmount: Number,

//   redeemStarts: Number,
//   redeemEnds: Number,
//   startsAt: Number,
//   expiresAt: Number,

//   status: {
//     type: String,
//     enum: ['draft', 'published'],
//     default: 'draft'
//   },

//   address: String,
//   transactionHash: String,

//   //  supports: [microcreditSupportSchema]
// }, { timestamps: true });

// const offerSchema = new mongoose.Schema({
//   title: String,
//   subtitle: String,
//   slug: String,
//   description: String,
//   imageURL: String,
//   cost: Number,
//   instructions: String,
//   expiresAt: Number
// }, { timestamps: true });

// const postSchema = new mongoose.Schema({
//   title: String,
//   slug: String,
//   subtitle: String,
//   description: String,
//   contentFiles: [String],
//   imageURL: String,
//   access: {
//     type: String,
//     enum: ['public', 'private', 'partners'],
//     default: 'public'
//   },
// }, { timestamps: true });

// const eventSchema = new mongoose.Schema({
//   title: String,
//   slug: String,
//   subtitle: String,
//   description: String,
//   contentFiles: [String],
//   imageURL: String,
//   access: {
//     type: String,
//     enum: ['public', 'private', 'partners'],
//     default: 'public'
//   },
//   location: String,
//   dateTime: Number
// }, { timestamps: true });

const addressSchema = new mongoose.Schema({
  street: String,
  postCode: String,
  city: String,
  coordinates: [String]
}, { _id: false });

const contactSchema = new mongoose.Schema({
  slug: String,
  name: String,
  value: String,
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  bic: String,
  name: String,
  value: String,
}, { _id: false });

const authSchema = new mongoose.Schema({
  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number
}, { _id: false });

const deactivateSchema = new mongoose.Schema({
  reason: String,
  createdAt: Date
});

const userSchema = new mongoose.Schema({
  name: String,
  slug: {
    type: String,
    default: 'none'
  },
  email: String,
  card: String,
  password: String,
  imageURL: String,

  account: {
    type: Object,
    // required: true
  },

  access: {
    type: UserAccess,
    enum: ['member', 'partner', 'admin'],
    default: UserAccess.MEMBER
  },
  sector: {
    type: String,
    //enum: ['None', 'B2B Services & Other Goods and Services', 'Durables', 'Durables (Technology)', 'Education', 'Food', 'Hotels, cafes and restaurants', 'Recreation and Culture'],
    default: 'None'
  },
  description: String,
  subtitle: String,
  phone: String,

  address: addressSchema,
  timetable: String,

  contacts: [contactSchema],
  payments: [paymentSchema],

  email_verified: {
    type: Boolean,
    default: true
  },
  pass_verified: {
    type: Boolean,
    default: true
  },
  activated: {
    type: Boolean,
    default: true
  },
  deactivations: [deactivateSchema],

  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number,

  oneClickToken: String,
  oneClickExpiration: Number,
  // auth: authSchema,
  // offers: [offerSchema],
  // posts: [postSchema],
  // events: [eventSchema],
  // microcredit: [microcreditCampaignSchema],
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
