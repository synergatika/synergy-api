import { ItemAccess, Partner } from '../../index';
import { ObjectId } from 'mongodb';

export interface Post {
  _id: string;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: ItemAccess;

  createdAt?: Date;
  updatedAt?: Date;

  published?: Boolean, // Future Variable to Hide Items

  partner: Partner | ObjectId;
}