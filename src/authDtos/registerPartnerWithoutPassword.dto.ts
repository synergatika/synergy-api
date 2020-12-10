import { IsString, IsNumber, IsEmail, IsEnum, IsOptional } from 'class-validator';
import RegisterUserWithoutPasswordDto from './registerUserWithoutPassword.dto';

class RegisterPartnerWithoutPasswordDto extends RegisterUserWithoutPasswordDto {
  @IsString()
  public name: string;

  @IsEmail()
  public email: string;

  @IsString()
  public sector: string;
  // @IsOptional()
  // @IsString()
  // public imageURL: string;

  // @IsOptional()
  // @IsString()
  // public description: string;

  // @IsOptional()
  // @IsString()
  // public subtitle: string;

  // @IsOptional()
  // @IsString()
  // public timetable: string;



  /** Address*/
  // @IsOptional()
  // @IsString()
  // public street: string;

  // @IsOptional()
  // @IsString()
  // public postCode: string;

  // @IsOptional()
  // @IsString()
  // public city: string;

  // @IsOptional()
  // @IsString()
  // public lat: string;

  // @IsOptional()
  // @IsString()
  // public long: string;

  /** Contact */
  // @IsOptional()
  // @IsString()
  // public websiteURL: string;

  // @IsOptional()
  // @IsString()
  // public phone: string;

  /** Payments */
  // @IsOptional()
  // @IsString()
  // public payments: string;
}

export default RegisterPartnerWithoutPasswordDto;
