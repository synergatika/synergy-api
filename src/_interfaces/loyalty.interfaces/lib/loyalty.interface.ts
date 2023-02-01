import { User } from '../../index';

export interface Loyalty {
    _id: string;

    member: User;
    currentPoints: number;
}