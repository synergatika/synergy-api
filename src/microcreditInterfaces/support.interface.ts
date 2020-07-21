import MicrocreditTransaction from './transaction.interface';

interface Support {
  campaign_id: string;
  support_id: string;
  backer_id: string;
  payment_id: string;
  initialTokens: number;
  redeemedTokens: number;
  contractIndex: number;
  method: string;
  status: string;

  transactions: MicrocreditTransaction[];
  createdAt: Date;
}
export default Support;
