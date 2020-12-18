import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemOfferDto {
  @IsString()
  public password: string;

  @IsNumber()
  public _points: number;

  @IsOptional()
  @IsNumber()
  public _amount: number;

  @IsOptional()
  @IsNumber()
  public quantity: number;
}
export default RedeemOfferDto;
