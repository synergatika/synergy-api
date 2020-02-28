interface User {
  _id: string;
  name: string,

  email: string;
  password: string;

  card: string;

  account: {
    version: number;
    id: string;
    address: string;
    crypto: object;
  };

  access: string;
  email_verified: boolean;
  pass_verified: boolean;
  createdAt: Date;
  imageURL: string;
  payments: {
    nationalBank: string,
    pireausBank: string,
    eurobank: string,
    alphaBank: string,
    paypal: string,
  },
  previousAccounts: Object;
}

export default User;
