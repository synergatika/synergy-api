interface Event {
  merchant_id: string;
  merchant_name: string;
  merchant_imageURL: string;

  event_id: string;
  event_imageURL: string;
  title: string;
  subtitle: string;
  description: string;
  access: string;
  location: string;
  dateTime: string;

  createdAt: Date;
  updatedAt: Date;
}
export default Event;
