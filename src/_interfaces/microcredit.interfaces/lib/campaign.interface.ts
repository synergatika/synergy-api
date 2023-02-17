import { ItemAccess, Partner } from '../../index';
import { MicrocreditTokens } from './tokens.interface';
import { MicrocreditStatistics } from './statistics.interface';
import { ObjectId } from 'mongodb';

export enum MicrocreditCampaignStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft'
}

export interface MicrocreditCampaign {
  _id: ObjectId;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  terms: string;
  description: string;
  contentFiles: string[];
  category: string;
  access: ItemAccess;
  status: string;

  redeemable: boolean;
  quantitative: boolean;
  stepAmount: number;
  minAllowed: number;
  maxAllowed: number;
  maxAmount: number;

  redeemStarts: number;
  redeemEnds: number;
  startsAt: number;
  expiresAt: number;

  tokens?: MicrocreditTokens;

  statistics?: {
    earned: MicrocreditStatistics,
    redeemed: MicrocreditStatistics
  }

  address: string;
  transactionHash: string;

  createdAt?: Date;
  updatedAt?: Date;

  partner: Partner | ObjectId;
}