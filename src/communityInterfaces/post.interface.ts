interface Post {
  merchant_id: string;
  merchant_name: string;
  merchant_imageURL: string;

  post_id: string;
  post_imageURL: string;
  title: string;
  subtitle: string;
  content: string;
  access: string;

  createdAt: Date;
  updatedAt: Date;
}
export default Post;
