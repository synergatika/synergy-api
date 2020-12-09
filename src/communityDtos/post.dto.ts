import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

class PostDto {
  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsOptional()
  @IsString()
  public subtitle: string;

  @IsString()
  public content: string;

  @IsOptional()
  @IsString()
  public contentFiles: string;

  @IsEnum(['public', 'private', 'partners'])
  public access: string;
}
export default PostDto;
