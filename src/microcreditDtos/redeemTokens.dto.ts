import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemTokensDto {
  @IsString()
  public password: string;

  @IsString()
  public _to: string;

  @IsNumber()
  public _points: number;
}

export default RedeemTokensDto;
