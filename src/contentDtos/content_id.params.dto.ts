import { IsString } from 'class-validator';

class ContentID {
  @IsString()
  public content_id: string;
}

export default ContentID;
