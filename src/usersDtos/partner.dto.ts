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
  public contacts: string;
}
export default PartnerDto;
