import { IsString } from 'class-validator';

class PostID {
  @IsString()
  public merchant_id: string;

  @IsString()
  public post_id: string;
}

export default PostID;
