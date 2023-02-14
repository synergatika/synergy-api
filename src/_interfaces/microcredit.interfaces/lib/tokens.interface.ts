import { ObjectId } from 'mongodb';

export interface MicrocreditTokens {
  _id: ObjectId;
  earnedTokens: string;
  paidTokens: string;
  redeemedTokens: string;
}