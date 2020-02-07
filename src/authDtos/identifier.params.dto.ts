import { IsString } from 'class-validator';

class IdentifierDto {
  @IsString()
  public identifier: string;
}

export default IdentifierDto;
