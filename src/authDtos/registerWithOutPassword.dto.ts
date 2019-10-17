import { IsString, IsEmail, IsOptional } from 'class-validator';

class RegisterWithOutPasswordDto {
  @IsString()
  public name: string;

  @IsEmail()
  public email: string;

  @IsOptional()
  @IsString()
  public sector: string;
}

export default RegisterWithOutPasswordDto;
