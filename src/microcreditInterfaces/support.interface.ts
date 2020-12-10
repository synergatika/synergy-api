import MicrocreditTransaction from './transaction.interface';

interface Support {
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
  status: string;

  initialTokens: number;
  currentTokens: number;

  type: string;
  transactions: MicrocreditTransaction[];

  createdAt: Date;
  updatedAt: Date;
  // campaign_id: string;
  // support_id: string;
  // backer_id: string;
  // payment_id: string;
  // initialTokens: number;
  // redeemedTokens: number;
  // contractIndex: number;
  // method: string;
  // status: string;

  // transactions: MicrocreditTransaction[];
  // createdAt: Date;
}
export default Support;
