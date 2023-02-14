import { Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface Post {
  _id: string;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: string;

  createdAt?: Date;
  updatedAt?: Date;

  partner: Partner | ObjectId;
}