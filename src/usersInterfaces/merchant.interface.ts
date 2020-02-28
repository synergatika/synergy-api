import User from './user.interface'

interface Merchant extends User {
  name: string;
  imageURL: string;
  slug: string;

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
  payments: {
    nationalBank: string,
    pireausBank: string,
    eurobank: string,
    alphaBank: string,
    paypal: string,
  }
  sector: string;
}

export default Merchant;
