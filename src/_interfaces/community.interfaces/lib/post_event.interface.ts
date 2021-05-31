import { Partner } from '../../index';

export interface PostEvent {
  _id: string;
  slug: string;
  imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  contentFiles: string[];
  access: string;
  type: string;
  location: string;
  dateTime: number;

  createdAt: Date;
  updatedAt: Date;

  partner: Partner;
}