import { IsString, IsEmail, Length, IsOptional } from 'class-validator';

class RegisterWithOutPasswordDto {
  @IsOptional()
  @IsString()
  // @IsEmail()
  public email: string;

  @IsOptional()
  @IsString()
  // @Length(16, 16)
  public card: string;
}

export default RegisterWithOutPasswordDto;
