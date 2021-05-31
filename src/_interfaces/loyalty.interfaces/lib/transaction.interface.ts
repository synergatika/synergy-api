export interface LoyaltyTransaction {
  _id?: string;

  partner_id: string;
  partner_name: string;

  member_id: string;

  offer_id: string;
  offer_title: string;

  points: number;
  amount: number;
  quantity: number;

  type: string;

  tx: string;
  createdAt: Date;
}