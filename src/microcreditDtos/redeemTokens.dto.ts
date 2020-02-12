import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemTokensDto {
  @IsString()
  public password: string;

  @IsString()
  public _to: string;

  @IsNumber()
  public _tokens: number;

  @IsOptional()
  @IsString()
  public support_id: string;
}

export default RedeemTokensDto;
