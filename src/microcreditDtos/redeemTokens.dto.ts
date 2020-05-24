import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemTokensDto {
  @IsNumber()
  public _tokens: number;
}

export default RedeemTokensDto;
