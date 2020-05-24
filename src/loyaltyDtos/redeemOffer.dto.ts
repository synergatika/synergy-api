import { IsString, IsNumber } from 'class-validator';

class RedeemOfferDto {
  @IsString()
  public password: string;

  @IsNumber()
  public _points: number;

  @IsNumber()
  public quantity: number;
}

export default RedeemOfferDto;
