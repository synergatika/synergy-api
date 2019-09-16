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
  restorationExpiration: Number,
  verificationToken: String,
  verificationExpiration: Number
});

const userSchema = new mongoose.Schema({
  contact: contactSchema,
  name: String,
  email: String,
  imageURL: String,
  password: {
    type: String,
    select: true
  },
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
}, {
  timestamps: true
});;

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;