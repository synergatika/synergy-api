import { IsString, IsNumber, IsEmail, IsEnum, IsOptional } from 'class-validator';
import RegisterUserWithPasswordDto from './registerUserWithPassword.dto';

class RegisterPartnerWithPasswordDto extends RegisterUserWithPasswordDto {
  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsOptional()
  @IsString()
  public description: string;

  @IsOptional()
  @IsString()
  public payments: string;
}

export default RegisterPartnerWithPasswordDto;
