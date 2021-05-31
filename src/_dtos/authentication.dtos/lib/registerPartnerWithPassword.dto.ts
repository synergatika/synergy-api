import { IsString } from 'class-validator';
import {RegisterPartnerWithoutPasswordDto} from './registerPartnerWithoutPassword.dto';

export class RegisterPartnerWithPasswordDto extends RegisterPartnerWithoutPasswordDto {
  @IsString()
  public password: string;
}