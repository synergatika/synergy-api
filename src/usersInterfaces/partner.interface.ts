import User from './user.interface';
import Bank from './bank.interface';

interface Partner extends User {
  slug: string;
  sector: string;

  subtitle: string;
  description: string;
  timetable: string;

  contact: {
    phone: number;
    websiteURL: string;
  };
  address: {
    street: string;
    city: string;
    postCode: string;
    coordinates: [string];
  };
  payments: [Bank];


  // nationalBank: string,
  // pireausBank: string,
  // eurobank: string,
  // alphaBank: string,
  // paypal: string,

}

export default Partner;
