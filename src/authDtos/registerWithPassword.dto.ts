import { IsString, IsEmail } from 'class-validator';
 
class RegisterWithPasswordDto {
  @IsString()
  public name: string;
 
  @IsEmail()
  public email: string;
 
  @IsString()
  public password: string;
}
 
export default RegisterWithPasswordDto;