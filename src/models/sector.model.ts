import * as mongoose from 'mongoose';
import { Sector } from '../_interfaces/index';

const sectorSchema = new mongoose.Schema({
  slug: String,
  el_title: String,
  en_title: String,
});

const sectorModel = mongoose.model<Sector & mongoose.Document>('Sector', sectorSchema);
export default sectorModel;
