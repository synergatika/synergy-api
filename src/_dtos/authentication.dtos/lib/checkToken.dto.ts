import { IsString } from 'class-validator';
 
export class CheckTokenDto {
  @IsString()
  public token: string;
}