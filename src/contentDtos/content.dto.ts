import { IsString } from 'class-validator';

class ContentDto {
  @IsString()
  public name: string;

  @IsString()
  public el_title: string;

  @IsString()
  public en_title: string;

  @IsString()
  public el_content: string;

  @IsString()
  public en_content: string;
}
export default ContentDto;
