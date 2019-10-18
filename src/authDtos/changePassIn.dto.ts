import { IsString } from 'class-validator';
 
class ChangePassInDto {
  @IsString()
  public oldPassword: string;
 
  @IsString()
  public newPassword: string;
}
 
export default ChangePassInDto;