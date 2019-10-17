import { IsString } from 'class-validator';
 
class CheckTokenDto {
  @IsString()
  public token: string;
}
 
export default CheckTokenDto;