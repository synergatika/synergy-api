import { IsString } from 'class-validator';
 
export class ChangePassInDto {
  @IsString()
  public oldPassword: string;
 
  @IsString()
  public newPassword: string;
}