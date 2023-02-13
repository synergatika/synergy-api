import { Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface LoyaltyOffer {
  _id: string;
  slug: string;
  imageURL: string;
  title: string;
  description: string;
  instructions: string;
  cost: number;
  expiresAt: number;

  createdAt?: Date;
  updatedAt?: Date;

  partner: Partner | string;
}
