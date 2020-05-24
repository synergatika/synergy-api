interface User {
  _id: string;
  name: string;
  slug: string;

  imageURL: string;

  email: string;
  password: string;

  email_verified: boolean;
  pass_verified: boolean;
  activated?: boolean;

  access: string;
  createdAt: Date;

  account: {
    version: number;
    id: string;
    address: string;
    crypto: object;
  };
  previousAccounts: Object;
}

export default User;
