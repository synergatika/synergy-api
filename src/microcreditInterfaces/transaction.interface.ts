interface MicrocreditTransaction {
  _id: string;

  partner_id: string;
  member_id: string;

  type: string;
  data: {
    campaign_id: string;
    campaign_title: string;
    address: string,
    support_id: string,
    contractIndex: number;
    tokens: number;
  };


  tx: string;
  createdAt: Date;
}

export default MicrocreditTransaction;
