import { IsString } from 'class-validator';
 
class changePassInDto {
  @IsString()
  public oldPassword: string;
 
  @IsString()
  public newPassword: string;
}
 
export default changePassInDto;