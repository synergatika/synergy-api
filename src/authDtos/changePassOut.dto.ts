import { IsString } from 'class-validator';
 
class ChangePassOutDto {
  @IsString()
  public newPassword: string;
 
  @IsString()
  public varPassword: string;

  @IsString()
  public token: string;
}
 
export default ChangePassOutDto;