import { MicrocreditSupport } from "./support.interface";

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending'
}

export interface MicrocreditTransaction {
  _id?: string;
  // support_id?: string,

  // partner_id: string;
  // partner_name: string;

  // member_id: string;

  // campaign_id: string;
  // campaign_title: string;
  // address: string;

  // method: number;
  // payment_id?: string;
  // tokens: number;

  support: MicrocreditSupport;
  status: TransactionStatus;

  contractIndex?: number;
  contractRef: string;

  type: string;

  tx: string;
  createdAt: Date;
}