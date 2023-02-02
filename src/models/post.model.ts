import * as mongoose from 'mongoose';
import { Post } from '../_interfaces/index';

const Schema = mongoose.Schema;

const postSchema = new mongoose.Schema({
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
}, { timestamps: true });

const postModel = mongoose.model<Post & mongoose.Document>('Post', postSchema);

export default postModel;