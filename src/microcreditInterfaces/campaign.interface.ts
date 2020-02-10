interface Campaign {
  merchant_name: string,
  merchant_id: string,
  merchant_imageURL: string,

  campaign_id: string,
  campaign_imageURL: string,
  title: string,
  terms: string,
  description: string,
  category: string,
  access: string,

  quantitative: boolean,
  minAllowed: number,
  maxAllowed: number,
  maxAmount: number,

  redeemStarts: Date,
  redeemEnds: Date,
  expiresAt: Date,

  supports: object;

  createdAt: Date
}
export default Campaign;
