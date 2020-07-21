import { IsString, IsOptional } from 'class-validator';

// export enum Sector {
//   n = 'None',
//   a = 'B2B Services & Other Goods and Services',
//   b = 'Durables',
//   c = 'Durables (Technology)',
//   d = 'Education',
//   e = 'Food',
//   f = 'Hotels, cafes and restaurants',
//   g = 'Recreation and Culture'
// }

class PartnerDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsOptional()
  @IsString()
  public sector: string;
  // @IsEnum(Sector)
  // public sector: Sector;

  @IsOptional()
  @IsString()
  public description: string;

  @IsOptional()
  @IsString()
  public subtitle: string;

  @IsOptional()
  @IsString()
  public street: string;

  @IsOptional()
  @IsString()
  public city: string;

  @IsOptional()
  @IsString()
  public postCode: string;

  @IsOptional()
  @IsString()
  public lat: string;

  @IsOptional()
  @IsString()
  public long: string;

  @IsOptional()
  @IsString()
  public timetable: string;

  @IsOptional()
  @IsString()
  public phone: string;

  @IsOptional()
  @IsString()
  public websiteURL: string;

  @IsOptional()
  @IsString()
  public payments: string;

  // @IsOptional()
  // @IsString()
  // public nationalBank: string;
  //
  // @IsOptional()
  // @IsString()
  // public pireausBank: string;
  //
  // @IsOptional()
  // @IsString()
  // public eurobank: string;
  //
  // @IsOptional()
  // @IsString()
  // public alphaBank: string;
  //
  // @IsOptional()
  // @IsString()
  // public paypal: string;
}
export default PartnerDto;
