interface User {
  _id?: string;
  email?: string;
  password?: string;
  access?: string;
  account?: {
    version: number;
    id: string;
    address: string;
    crypto: object;
  };
  pass_verified?: boolean;
  oneClickToken?: any;
  oneClickExpiration?: any;
  createdBy?: any;

  name?: string;
  slug?: string;
  imageURL?: string;
  email_verified?: boolean;
  activated?: boolean;
  createdAt?: Date;
  previousAccounts?: any;
  card?: string;
  payments?: any;
  address?: {
    street: any;
    city: any;
    postCode: any;
    coordinates: Array<any>
  };
  description?: string;
  subtitle?: string;
  timetable?: any;
  contact?: {
    phone: any,
    websiteURL: any,
  },
  sector?: any;
}

export default User;
