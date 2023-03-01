import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RedeemPointsDto {
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