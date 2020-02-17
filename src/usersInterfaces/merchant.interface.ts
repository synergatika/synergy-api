import User from './user.interface'

interface Merchant extends User {
  name: string;
  imageURL: string;

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
  sector: string;
}

export default Merchant;
