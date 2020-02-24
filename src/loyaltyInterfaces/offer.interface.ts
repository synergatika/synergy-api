interface Offer {
  merchant_id: string;
  merchant_slug: string;
  merchant_name: string;
  merchant_imageURL: string;

  offer_id: string;
  offer_slug: string;
  offer_imageURL: string;
  title: string;
  description: string;
  cost: number;
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}
export default Offer;
