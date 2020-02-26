import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemPointsDto {
  @IsString()
  public password: string;

  @IsString()
  public _to: string;

  @IsNumber()
  public _points: number;

  @IsString()
  @IsOptional()
  public offer_id: string;
}

export default RedeemPointsDto;
