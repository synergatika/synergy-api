import Support from './support.interface';

interface Campaign {
  merchant_name: string,
  merchant_id: string,
  merchant_imageURL: string,
  merchant_payment: {

  }

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

  address: string,
  transactionHash: string,

  supports: Support[];

  createdAt: Date
}
export default Campaign;
