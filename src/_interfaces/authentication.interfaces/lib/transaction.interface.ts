import { ObjectId } from "mongodb";
import { User } from "../../users.interfaces/index";

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending'
}

export enum RegistrationTransactionType {
  RegisterMember = 'RegisterMember',
  RegisterPartner = 'RegisterPartner',
  RecoverPoints = 'RecoverPoints'
}

export interface RegistrationTransaction {
  _id: ObjectId;

  user: User | ObjectId;

  user_id: string;
  encryptBy: string;

  type: RegistrationTransactionType;
  status: TransactionStatus;

  tx: string;
  createdAt: Date;
}