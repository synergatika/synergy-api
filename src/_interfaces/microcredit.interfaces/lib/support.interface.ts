import { MicrocreditTransaction } from './transaction.interface';

export enum SupportStatus {
  COMPLETED = 'completed',
  PAID = 'paid',
  UNPAID = 'unpaid'
}

export interface MicrocreditSupport {
  _id?: string;
  support_id: string;

  partner_id: string;
  member_id: string;

  campaign_id: string;
  address: string;
  contractIndex: number;
  contractRef: string;

  payment_id: string;
  method: string;
  status: SupportStatus;

  initialTokens: number;
  currentTokens: number;

  type: string;
  transactions: MicrocreditTransaction[];

  createdAt: Date;
  updatedAt: Date;
}
