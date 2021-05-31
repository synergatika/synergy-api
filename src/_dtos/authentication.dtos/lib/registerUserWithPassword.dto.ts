import { IsString, IsEmail } from 'class-validator';

export class RegisterUserWithPasswordDto {
  @IsString()
  public name: string;

  @IsEmail()
  public email: string;

  @IsString()
  public password: string;
}