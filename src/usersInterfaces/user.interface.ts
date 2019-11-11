interface User {
  _id: string;
  name: string,

  email: string;
  password: string;
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

  previousAccounts: Object;
}

export default User;