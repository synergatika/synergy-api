interface Post {
  partner_id: string;
  partner_slug: string;
  partner_name: string;
  partner_imageURL: string;

  post_id: string;
  post_slug: string;
  post_imageURL: string;
  title: string;
  subtitle: string;
  content: string;
  access: string;

  createdAt: Date;
  updatedAt: Date;
}
export default Post;
