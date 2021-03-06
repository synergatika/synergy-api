import { User } from './user.interface';
// import {PartnerAddress} from './partner_address.interface';
// import {PartnerContact} from './partner_contact.interface';
// import {PartnerPayment} from './partner_payment.interface';

export interface PartnerAddress {
  street: string;
  city: string;
  postCode: string;
  coordinates: [string];
}

export interface PartnerContact {
  slug: string;
  name: string;
  value: string;
}

export interface PartnerPayment {
  bic: string;
  name: string;
  value: string;
}

export interface Partner extends User {
  slug: string;
  sector: string;

  subtitle: string;
  description: string;
  timetable: string;
  phone: string;

  address: PartnerAddress;
  payments: [PartnerPayment];
  contacts: [PartnerContact];
}