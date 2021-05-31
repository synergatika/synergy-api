import { IsString } from 'class-validator';

export class PostID {
  @IsString()
  public partner_id: string;

  @IsString()
  public post_id: string;
}