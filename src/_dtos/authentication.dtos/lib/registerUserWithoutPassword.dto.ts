import { IsString, IsEmail, Length, ValidateIf, IsOptional } from 'class-validator';

export class RegisterUserWithoutPasswordDto {
  @ValidateIf(o => o.card == undefined)
  @IsString()
  @IsEmail()
  public email: string;

  @ValidateIf(o => o.email == undefined)
  @IsString()
  @Length(16, 16)
  public card: string;
}
