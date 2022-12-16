import * as mongoose from 'mongoose';
import { Event } from '../_interfaces/index';

const Schema = mongoose.Schema;

const eventSchema = new mongoose.Schema({
  partner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  title: String,
  slug: String,
  subtitle: String,
  description: String,
  contentFiles: [String],
  imageURL: String,
  access: {
    type: String,
    enum: ['public', 'private', 'partners'],
    default: 'public'
  },
  location: String,
  dateTime: Number
}, { timestamps: true });

const eventModel = mongoose.model<Event & mongoose.Document>('Event', eventSchema);

export default eventModel;