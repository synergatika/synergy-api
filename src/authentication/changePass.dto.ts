import { IsString } from 'class-validator';
 
class ChangePassDto {
  @IsString()
  public password: string;
 
  @IsString()
  public new: string;
}
 
export default ChangePassDto;