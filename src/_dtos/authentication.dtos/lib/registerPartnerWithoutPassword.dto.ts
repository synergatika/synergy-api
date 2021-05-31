import { IsString, IsNumber, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { RegisterUserWithoutPasswordDto } from './registerUserWithoutPassword.dto';

export class RegisterPartnerWithoutPasswordDto extends RegisterUserWithoutPasswordDto {
  @IsString()
  public name: string;

  @IsEmail()
  public email: string;

  @IsString()
  public sector: string;
}

