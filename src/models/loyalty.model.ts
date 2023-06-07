import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { Loyalty } from '../_interfaces/index';

const loyaltySchema = new mongoose.Schema({
    member: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    currentPoints: Number,
}, { timestamps: true });

const loyaltyModel = mongoose.model<Loyalty & mongoose.Document>('Loyalty', loyaltySchema);
export default loyaltyModel;