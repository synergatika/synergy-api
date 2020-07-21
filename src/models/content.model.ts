import * as mongoose from 'mongoose';
import Content from '../contentInterfaces/content.interface';

const contentSchema = new mongoose.Schema({
  name: String,
  el_title: String,
  en_title: String,
  el_content: String,
  en_content: String
});

const contentModel = mongoose.model<Content & mongoose.Document>('Content', contentSchema);
export default contentModel;
