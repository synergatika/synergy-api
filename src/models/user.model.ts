import * as mongoose from 'mongoose';
import User from '../usersInterfaces/user.interface';
import { object } from 'prop-types';

const campaignSchema = new mongoose.Schema({
  description: String,
  state: {
    type: String,
    enum: ['draft', 'checking', 'public', 'private', 'expired'],
    default: 'draft'
  },
  expiresAt: Date
}, { timestamps: true });

const offerSchema = new mongoose.Schema({
  description: String,
  cost: Number,
  expiresAt: Date
}, { timestamps: true });

const addressSchema = new mongoose.Schema({
  street: String,
  zipCode: Number,
  city: String
}, { _id: false });

const contactSchema = new mongoose.Schema({
  address: addressSchema,
  phone: String,
  websiteURL: String
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
  password: String,
  imageURL: String,

  account: {
    type: Object,
    // required: true
  },

  access: {
    type: String,
    enum: ['customer', 'merchant', 'admin'],
    default: 'custumer'
  },
  sector: {
    type: String,
    enum: ['None', 'B2B Services & Other Goods and Services', 'Durables', 'Durables (Technology)', 'Education', 'Food', 'Hotels, cafes and restaurants', 'Recreation and Culture'],
    default: 'None'
  },
  contact: contactSchema,

  email_verified: Boolean,
  pass_verified: Boolean,
  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number,
  // auth: authSchema,
  offers: [offerSchema],
  campaigns: [campaignSchema],
  previousAccounts: [Object]
}, {
  timestamps: true
});

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;
