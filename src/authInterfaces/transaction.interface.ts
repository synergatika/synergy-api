interface RegistrationTransaction {
  _id: string;

  from_id: string;
  to_id: string;

  tx: string;
  type: string;

  createdAt: Date;
}
export default RegistrationTransaction;
