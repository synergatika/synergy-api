import PartnerAddress from '../usersInterfaces/partner_address.interface';
import PartnerContact from '../usersInterfaces/partner_contact.interface';
import PartnerPayment from '../usersInterfaces/partner_payment.interface';

interface Offer {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  partner_imageURL: string;

  partner_address: PartnerAddress;
  partner_phone: string;
  partner_contacts: [PartnerContact];
  partner_payments: [PartnerPayment];

  offer_id: string;
  offer_slug: string;
  offer_imageURL: string;
  title: string;
  description: string;
  instructions: string;
  cost: number;
  expiresAt: number;

  createdAt: Date;
  updatedAt: Date;
}
export default Offer;
