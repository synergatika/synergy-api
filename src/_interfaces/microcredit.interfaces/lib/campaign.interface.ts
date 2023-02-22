import { ItemAccess, Partner, TransactionStatus } from '../../index';
import { ObjectId } from 'mongodb';

interface MicrocreditTokens {
  total: number;
  paid: number;
  current: number;
}

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

  status: MicrocreditCampaignStatus;
  registered: TransactionStatus;

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

  address: string;
  transactionHash: string;

  createdAt?: Date;
  updatedAt?: Date;

  published?: Boolean, // Future Variable to Hide Items

  partner: Partner | ObjectId;
}