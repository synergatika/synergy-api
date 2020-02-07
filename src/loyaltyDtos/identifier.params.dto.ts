import { IsString } from 'class-validator';

class IdentifierDto {
  @IsString()
  public _to: string;
}

export default IdentifierDto;
