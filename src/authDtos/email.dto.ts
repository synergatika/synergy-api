import { IsEmail } from 'class-validator';
 
class EmailDto {
  @IsEmail()
  public email: string;
}
 
export default EmailDto;