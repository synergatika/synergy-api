import { IsString } from 'class-validator';

export class ChangePassOutDto {
  @IsString()
  public newPassword: string;

  @IsString()
  public verPassword: string;

  @IsString()
  public token: string;
}
