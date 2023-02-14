import { Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface Event {
  _id: ObjectId;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: string;
  location: string;
  dateTime: number;

  createdAt?: Date;
  updatedAt?: Date;

  partner: Partner | ObjectId;
}