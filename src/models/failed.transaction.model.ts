import * as mongoose from 'mongoose';
import FailedTransaction from '../interfaces/failed.transaction.interface';

const failedTransactionSchema = new mongoose.Schema({
}, {
  timestamps: true
});

const failedTransactionModel = mongoose.model<FailedTransaction & mongoose.Document>('FailedTransaction', failedTransactionSchema);
export default failedTransactionModel;