import { Partner } from '../../index';

export interface Post {
  _id: string;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: string;

  createdAt: Date;
  updatedAt: Date;

  partner: Partner;
}