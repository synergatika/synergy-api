import * as mongoose from 'mongoose';
import User from './user.interface';

const offerSchema = new mongoose.Schema({
  description: String,
  cost: Number,
  expiresAt: String
}, { timestamps: true });

const addressSchema = new mongoose.Schema({
  street: String,
  zipCode: Number,
  city: String
});

const contactSchema = new mongoose.Schema({
  address: addressSchema,
  phone: String,
  web: String
});

const authSchema = new mongoose.Schema({
  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number
});

const userSchema = new mongoose.Schema({
  contact: contactSchema,
  name: String,
  email: String,
  imageURL: String,
  password: String,
  access: {
    type: String,
    enum: ['customer', 'merchant', 'admin'],
    default: 'custumer'
  },
  restorationToken: String,
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number,
  //auth: authSchema,
  verified: Boolean,
  offers: [offerSchema]
}, {
  timestamps: true
});

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;