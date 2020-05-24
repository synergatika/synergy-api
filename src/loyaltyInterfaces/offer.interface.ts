interface Offer {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  partner_imageURL: string;

  offer_id: string;
  offer_slug: string;
  offer_imageURL: string;
  title: string;
  description: string;
  cost: number;
  expiresAt: number;

  createdAt: Date;
  updatedAt: Date;
}
export default Offer;
