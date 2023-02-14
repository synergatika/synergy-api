import { ObjectId } from 'mongodb';

export interface Account {
  version: number;
  id: string;
  address: string;
  crypto: Object;
}

export enum UserAccess {
  ADMIN = 'admin',
  PARTNER = 'partner',
  MEMBER = 'member',
}

export interface User {
  _id?: ObjectId;
  email?: string;
  card?: string;
  password?: string;
  access?: UserAccess;
  slug?: string;
  imageURL?: string;
  account?: Account;

  oneClickToken?: any;
  oneClickExpiration?: any;
  createdBy?: any;

  name?: string;
  // slug?: string;

  email_verified?: boolean;
  pass_verified?: boolean;
  activated?: boolean;

  createdAt?: Date;
  previousAccounts?: any;
  // card?: string;

  // payments?: any;

  // address?: {
  //   street: any;
  //   city: any;
  //   postCode: any;
  //   coordinates: Array<any>
  // };
  // description?: string;
  // subtitle?: string;
  // timetable?: any;
  // contact?: {
  //   phone: any,
  //   websiteURL: any,
  // },
  // sector?: any;
}