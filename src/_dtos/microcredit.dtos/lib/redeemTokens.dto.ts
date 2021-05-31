import { IsNumber } from 'class-validator';

export class RedeemTokensDto {
  @IsNumber()
  public _tokens: number;
}