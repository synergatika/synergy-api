import { IsString, IsOptional } from 'class-validator';

export class MemberDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public imageURL: string;
}