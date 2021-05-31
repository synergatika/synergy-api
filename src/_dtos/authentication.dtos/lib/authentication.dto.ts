import { IsString, IsEmail } from 'class-validator';

export class AuthenticationDto {
  @IsEmail()
  public email: string;

  @IsString()
  public password: string;
}