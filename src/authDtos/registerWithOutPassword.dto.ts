import { IsString, IsEmail, IsEnum } from 'class-validator';
 
export enum Access {
  Customer = 'customer',
  Merchant = 'merchant',
}

class RegisterWithOutPasswordDto {
  @IsString()
  public name: string;
 
  @IsEmail()
  public email: string;
}
 
export default RegisterWithOutPasswordDto;