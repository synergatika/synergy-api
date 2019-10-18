import { IsString, IsEmail } from 'class-validator';

class AuthenticationDto {
  @IsEmail()
  public email: string;

  @IsString()
  public password: string;
}

export default AuthenticationDto;