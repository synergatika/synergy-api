import { IsString } from 'class-validator';

export class ContentID {
  @IsString()
  public content_id: string;
}
