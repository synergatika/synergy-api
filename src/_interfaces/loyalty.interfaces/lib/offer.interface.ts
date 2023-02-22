import { Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface LoyaltyOffer {
  _id: ObjectId;
  slug: string;
  imageURL: string;
  title: string;
  description: string;
  instructions: string;
  cost: number;
  expiresAt: number;

  createdAt?: Date;
  updatedAt?: Date;

  published?: Boolean, // Future Variable to Hide Items

  partner: Partner | ObjectId;
}
