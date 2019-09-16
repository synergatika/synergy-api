interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  access: string;
  verified: boolean;
  restorationToken: string;
  restorationExpiration: number;
  verificationToken: string;
  verificationExpiration: number;
  /*auth: {
    restorationToken: string;
   restorationExpiration: number;
    verificationToken: string;
    verificationExpiration: number;
  }*/
  contact: {
    phone: number;
    address: {
      street: string;
      city: string;
      zipCode: number;
    }
  }
}

export default User;