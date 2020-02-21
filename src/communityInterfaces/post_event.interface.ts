interface PostEvent {
  merchant_id: string;
  merchant_name: string;
  merchant_imageURL: string;

  post_event_id: string;
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
