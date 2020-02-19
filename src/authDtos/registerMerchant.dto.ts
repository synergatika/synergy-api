import { IsString, IsNumber, IsEmail, IsEnum, IsOptional } from 'class-validator';

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

class RegisterMerchantDto {
  @IsString()
  @IsEmail()
  public email: string;

  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsEnum(Sector)
  public sector: Sector;

  @IsString()
  public street: string;

  @IsString()
  public city: string;

  @IsString()
  public postCode: string;

  @IsString()
  public lat: string;

  @IsString()
  public long: string;

  @IsString()
  public phone: string;

  @IsOptional()
  @IsString()
  public websiteURL: string;

  @IsOptional()
  @IsString()
  public nationalBank: string;

  @IsOptional()
  @IsString()
  public pireausBank: string;

  @IsOptional()
  @IsString()
  public eurobank: string;

  @IsOptional()
  @IsString()
  public alphaBank: string;

  @IsOptional()
  @IsString()
  public paypal: string;
}

export default RegisterMerchantDto;