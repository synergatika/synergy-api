import { IsString, IsEmail } from 'class-validator';
 
class RegisterWithOutPasswordDto {
  @IsString()
  public name: string;
 
  @IsEmail()
  public email: string;
}
 
export default RegisterWithOutPasswordDto;