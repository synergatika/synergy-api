interface Event {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  partner_imageURL: string;

  event_id: string;
  event_slug: string;
  event_imageURL: string;
  title: string;
  subtitle: string;
  content: string;
  contentFiles: string[];
  access: string;
  location: string;
  dateTime: number;

  createdAt: Date;
  updatedAt: Date;
}
export default Event;
