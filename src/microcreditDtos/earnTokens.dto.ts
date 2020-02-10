import { IsNumber } from 'class-validator';

class EarnTokensDto {
  @IsNumber()
  public _amount: number;
}

export default EarnTokensDto;
