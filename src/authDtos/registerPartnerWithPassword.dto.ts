import { IsString } from 'class-validator';
import RegisterPartnerWithoutPasswordDto from './registerPartnerWithoutPassword.dto';

class RegisterPartnerWithPasswordDto extends RegisterPartnerWithoutPasswordDto {
  @IsString()
  public password: string;
}

export default RegisterPartnerWithPasswordDto;
