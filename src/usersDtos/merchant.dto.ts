import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';


/*
export class Address {
  @IsString()
  public street: string;

  @IsString()
  public city: string;

  @IsNumber()
  public postCode: number;
}

export class Contact {
  @IsString()
  public phone: string;

  @IsOptional()
  @IsString()
  public websiteURL: string;

  @IsString()
  public address: Address;
}*/

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

class MerchantDto {
  @IsString()
  public name: string;

  @IsEnum(Sector)
  public sector: Sector;

  @IsOptional()
  @IsString()
  public imageURL: string;

  //public contact: Contact;
  @IsString()
  public street: string;

  @IsString()
  public city: string;

  @IsString()
  public postCode: string;

  @IsString()
  public phone: string;

  @IsOptional()
  @IsString()
  public websiteURL: string;

}

export default MerchantDto;
