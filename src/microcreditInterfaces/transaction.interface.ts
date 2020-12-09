interface MicrocreditTransaction {
  _id?: string;
  support_id?: string,

  partner_id: string;
  partner_name: string;

  member_id: string;

  campaign_id: string;
  campaign_title: string;
  address: string;

  method: number;
  payment_id?: string;
  tokens: number;

  contractIndex?: number;
  contractRef: string;

  type: string;

  tx: string;
  createdAt: Date;
}

export default MicrocreditTransaction;
