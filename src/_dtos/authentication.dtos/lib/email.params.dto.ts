import { IsString, IsEmail } from 'class-validator';

export class EmailDto {
  @IsString()
  @IsEmail()
  public email: string;
}