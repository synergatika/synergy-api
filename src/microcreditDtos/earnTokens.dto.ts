import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

class EarnTokensDto {
  @IsNumber()
  public _amount: number;

  @IsOptional()
  @IsBoolean()
  public paid: boolean;
}

export default EarnTokensDto;
