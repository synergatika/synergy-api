export interface RegistrationTransaction {
  _id: string;

  user_id: string;
  type: string;

  tx: string;
  createdAt: Date;
}