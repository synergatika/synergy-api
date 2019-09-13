import * as mongoose from 'mongoose';
import User from './user.interface';

const addressSchema = new mongoose.Schema({
  street: String,
  zipCode: Number,
  city: String
});

const contactSchema = new mongoose.Schema({
  address: addressSchema,
  phone: String
});

const authSchema = new mongoose.Schema({
  restorationToken: String,
  restorationExpiration: Date,
  verificationToken: String,
  vericationEpiration: Date
});

const userSchema = new mongoose.Schema({
  contact: contactSchema,
  name: String,
  email: String,
  password: String,
  type: String,
  access: String,
  auth: authSchema,
  verify: Boolean
}, {
  timestamps: true
});;

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;