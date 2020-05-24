import { IsString, IsEnum } from 'class-validator';

export enum Access {
  m = 'partner',
  c = 'member'
}

class AccessDto {
  @IsString()
  @IsEnum(Access)
  public access: Access;
}

export default AccessDto;
