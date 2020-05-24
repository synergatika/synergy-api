import { IsString, IsNumber, IsOptional } from 'class-validator';

class RedeemPointsDto {
  @IsString()
  public password: string;

  @IsNumber()
  public _points: number;
}

export default RedeemPointsDto;
