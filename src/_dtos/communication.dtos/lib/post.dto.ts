import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ItemAccess } from '_interfaces';

export class PostDto {
  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsOptional()
  @IsString()
  public subtitle: string;

  @IsString()
  public description: string;

  @IsOptional()
  @IsString()
  public contentFiles: string;

  @IsEnum(['public', 'private', 'partners'])
  public access: ItemAccess;
}