import { User } from '@sentry/node';
import { Schema } from 'mongoose';
import { Member } from '_interfaces/users.interfaces';
import { MicrocreditCampaign } from './campaign.interface';
import { MicrocreditTransaction } from './transaction.interface';
import { ObjectId } from 'mongodb';

export enum SupportStatus {
  COMPLETED = 'completed',
  PAID = 'paid',
  UNPAID = 'unpaid'
}

export interface SupportPayment {
  _id: string;
  method: {
    bic: string,
    name: string,
    value: string
  };
}

export interface MicrocreditSupport {
  _id?: ObjectId;

  member: Member | string;
  campaign: MicrocreditCampaign | string;
  // support_id: string;

  // partner_id: string;
  // member_id: string;

  // campaign_id: string;
  // address: string;
  // contractIndex: number;
  // contractRef: string;

  // payment_id: string;
  // method: string;
  // status: SupportStatus;

  initialTokens: number;
  currentTokens: number;

  payment: SupportPayment;
  status: SupportStatus;
  // type: string;
  // transactions: MicrocreditTransaction[];

  /** Blockchain Variables */
  contractRef?: string;
  contractIndex?: string;
  /** ----- */

  createdAt?: Date;
  updatedAt?: Date;
}
