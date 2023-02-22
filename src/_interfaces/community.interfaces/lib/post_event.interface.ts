import { Partner } from '../../index';
import { ObjectId } from 'mongodb';

export enum ItemAccess {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PARTNERS = 'partners',
}

export interface PostEvent {
  _id: ObjectId;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: ItemAccess;
  type: string;
  location: string;
  dateTime: number;

  createdAt: Date;
  updatedAt: Date;

  published?: Boolean, // Future Variable to Hide Items

  partner: Partner | ObjectId;
}