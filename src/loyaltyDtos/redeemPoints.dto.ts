import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemPointsDto {
  @IsString()
  public password: string;

  @IsNumber()
  public _points: number;

  @IsOptional()
  @IsNumber()
  public quantity: number;
}

export default RedeemPointsDto;
