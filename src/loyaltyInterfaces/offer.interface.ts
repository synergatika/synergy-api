interface Offer {
  merchant_id: string;
  merchant_name: string;
  merchant_imageURL: string;

  offer_id: string;
  offer_imageURL: string;
  title: string;
  description: string;
  cost: number;
  expiresAt: Date;

  createdAt: Date;
}
export default Offer;
