interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  type: string;
  access: string;
  verify: boolean;
  auth: {
    restorationToken: string;
    restorationExpiration: Date;
    verificationToken: string;
    verificationExpiration: Date;
  }
  contact: {
    phone: Number;
    address: {
      street: string;
      city: string;
      zipCode: Number;
    }
  }
}

export default User;