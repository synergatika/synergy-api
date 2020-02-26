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

  createdAt: Date;
}
export default Support;
