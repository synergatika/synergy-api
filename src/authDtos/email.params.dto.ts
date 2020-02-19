import { IsString, IsEmail } from 'class-validator';

class EmailDto {
  @IsString()
  @IsEmail()
  public email: string;
}

export default EmailDto;
