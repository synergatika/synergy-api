import { TransactionStatus } from "_interfaces/microcredit.interfaces";
import { ObjectId } from "mongodb";
import { User } from "_interfaces/users.interfaces";

export enum RegistrationTransactionType {
  RegisterMember = 'RegisterMember',
  RegisterPartner = 'RegisterPartner',
  RecoverPoints = 'RecoverPoints'
}

export interface RegistrationTransaction {
  _id: ObjectId;

  user: User;

  user_id: string;
  encryptBy: string;

  type: RegistrationTransactionType;
  status: TransactionStatus;

  tx: string;
  createdAt: Date;
}