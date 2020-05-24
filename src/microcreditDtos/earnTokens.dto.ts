import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional } from 'class-validator';

class EarnTokensDto {
  @IsNumber()
  public _amount: number;

  @IsString()
  public method: string;

  @IsOptional()
  @IsBoolean()
  public paid: boolean;
}

export default EarnTokensDto;
