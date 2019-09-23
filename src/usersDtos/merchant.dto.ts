import { IsString, IsNumber } from 'class-validator';
/*
export enum Access {
  Customer = 'customer',
  Merchant = 'merchant',
}

class RegisterWithOutPasswordDto {
  @IsString()
  public name: string;
 
  @IsEmail()
  public email: string;
 
  @IsEnum(Access) 
  public access: Access 
}
 
export default RegisterWithOutPasswordDto;
*/

export class Address {
  @IsString()
  public street: string;

  @IsString()
  public city: string;

  @IsNumber()
  public zipCode: number;
}

export class Contact {
  @IsString()
  public phone: string;

  @IsString()
  public websiteURL: string;

  @IsString()
  public address: Address;
}

class MerchantDto {
  @IsString()
  public name: string;

  @IsString()
  public imageURL: string;

  public contact: Contact
}

export default MerchantDto;