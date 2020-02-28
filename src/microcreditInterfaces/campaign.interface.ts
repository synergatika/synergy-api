import Support from './support.interface';

interface Campaign {
  merchant_name: string;
  merchant_id: string;
  merchant_slug: string;
  merchant_imageURL: string;
  merchant_payments: {
    nationalBank: string;
    pireausBank: string;
    eurobank: string;
    alphaBank: string;
    paypal: string;
  };

  campaign_id: string;
  campaign_slug: string;
  campaign_imageURL: string;
  title: string;
  subtitle: string;
  terms: string;
  description: string;
  category: string;
  access: string;
  status: string;

  quantitative: boolean;
  stepAmount: number;
  minAllowed: number;
  maxAllowed: number;
  maxAmount: number;

  redeemStarts: number;
  redeemEnds: number;
  startsAt: number;
  expiresAt: number;

  confirmedTokens: {
    initialTokens: number,
    redeemedTokens: number
  };
  orderedTokens: {
    initialTokens: number,
    redeemedTokens: number
  };

  address: string;
  transactionHash: string;

  supports: Support[];

  createdAt: Date;
  updatedAt: Date;
}
export default Campaign;
