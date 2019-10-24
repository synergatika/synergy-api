interface User {
  _id: string;

  name: string;
  imageURL: String

  email: string;
  password: string;

  access: string;
  email_verified: boolean;
  pass_verified: boolean;
  createdAt: Date;
}

export default User;