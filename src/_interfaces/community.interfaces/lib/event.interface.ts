import { ItemAccess, Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface Event {
  _id: ObjectId;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: ItemAccess;
  location: string;
  dateTime: number;

  createdAt?: Date;
  updatedAt?: Date;

  published?: Boolean, // Future Variable to Hide Items

  partner: Partner | ObjectId;
}