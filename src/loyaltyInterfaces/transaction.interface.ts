interface LoyaltyTransaction {
  _id: string;

  member_id: string;
  partner_id: string;

  type: string;
  data: {
    partner_name: string;
    partner_email: string;
    points: number,
    amount: number,
    offer_id: string;
    offer_title: string
  };

  tx: string;
  createdAt: Date;
}

export default LoyaltyTransaction;
