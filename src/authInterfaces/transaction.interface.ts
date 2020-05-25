interface RegistrationTransaction {
  _id: string;

  type: string;
  data: {
    user_id: string;
  }

  tx: string;
  createdAt: Date;
}
export default RegistrationTransaction;
