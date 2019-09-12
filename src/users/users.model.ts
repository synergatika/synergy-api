import * as mongoose from 'mongoose';
import User from './user.interface';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  restoreToken: String,
  restoreExpiration: Date,
  verify: Boolean
});

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;