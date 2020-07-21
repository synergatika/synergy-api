import { IsString, IsEnum, IsOptional } from 'class-validator';

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

  @IsEnum(['public', 'private', 'partners'])
  public access: string;
}
export default PostDto;
