import { User } from '../../index';
import { ObjectId } from 'mongodb';

export interface Loyalty {
    _id: string;

    member: User | ObjectId;
    currentPoints: number;
}