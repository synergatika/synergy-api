interface User {
    _id: string;
    name: string;
    email: string;
    password: string;
    verify: boolean;
    restoreExpiration: Date;
    restoreToken: string;
  }
   
  export default User;