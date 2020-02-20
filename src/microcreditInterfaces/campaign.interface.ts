import Support from './support.interface';

interface Campaign {
  merchant_name: string;
  merchant_id: string;
  merchant_imageURL: string;
  merchant_payment: {
  };

  campaign_id: string;
  campaign_imageURL: string;
  title: string;
  terms: string;
  description: string;
  category: string;
  access: string;

  quantitative: boolean;
  stepAmount: number;
  minAllowed: number;
  maxAllowed: number;
  maxAmount: number;

  redeemStarts: number;
  redeemEnds: number;
  startsAt: number;
  expiresAt: number;

  address: string;
  transactionHash: string;

  supports: Support[];

  createdAt: Date;
  updatedAt: Date;
}
export default Campaign;
