import * as mongoose from 'mongoose';
import Sector from '../contentInterfaces/sector.interface';

const sectorSchema = new mongoose.Schema({
  slug: String,
  el_title: String,
  en_title: String,
});

const sectorModel = mongoose.model<Sector & mongoose.Document>('Sector', sectorSchema);
export default sectorModel;
