import User from './user.interface';
import PartnerAddress from './partner_address.interface';
import PartnerContact from './partner_contact.interface';
import PartnerPayment from './partner_payment.interface';

interface Partner extends User {
  slug: string;
  sector: string;

  subtitle: string;
  description: string;
  timetable: string;

  contact: PartnerContact;
  address: PartnerAddress;
  payments: [PartnerPayment];
}

export default Partner;
