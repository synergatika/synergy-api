import { IsString, IsOptional } from 'class-validator';

class DeactivationDto {
  @IsOptional()
  @IsString()
  public reason: string;
}

export default DeactivationDto;
