import { IsString, IsEnum } from 'class-validator';
import { UserAccess } from '../../../_interfaces/index';

export class AccessDto {
  @IsEnum(UserAccess)
  public access: UserAccess;
}
