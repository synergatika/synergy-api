import * as mongoose from 'mongoose';
import { Invitation } from '../_interfaces/index';

const invitationSchema = new mongoose.Schema({

  sender_id: String,
  receiver_email: String,

  points: Number,
  completed: Boolean
}, {
  timestamps: true
});

const invitationModel = mongoose.model<Invitation & mongoose.Document>('Invitation', invitationSchema);
export default invitationModel;
