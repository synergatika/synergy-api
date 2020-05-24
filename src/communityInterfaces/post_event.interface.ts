interface PostEvent {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  partner_imageURL: string;

  post_event_id: string;
  post_event_slug: string;
  post_event_imageURL: string;
  title: string;
  subtitle: string;
  content: string;
  access: string;
  type: string;
  location: string;
  dateTime: number;

  createdAt: Date;
}
export default PostEvent;
