import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
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

export enum Sector {
  n = 'None',
  a = 'B2B Services & Other Goods and Services',
  b = 'Durables',
  c = 'Durables (Technology)',
  d = 'Education',
  e = 'Food',
  f = 'Hotels, cafes and restaurants',
  g = 'Recreation and Culture'
}

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

  @IsOptional()
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

  @IsEnum(Sector)
  public sector: Sector;

  public contact: Contact;
}

export default MerchantDto;
