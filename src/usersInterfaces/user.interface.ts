interface User {
  _id: string;

  name: string;
  imageURL: String

  email: string;
  password: string;

  access: string;
  verified: boolean;
  createdAt: Date;
}

export default User;