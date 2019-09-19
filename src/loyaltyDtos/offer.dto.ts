import { IsString, IsNumber } from 'class-validator';

class OfferDto {
  @IsString()
  public description: string;

  @IsNumber()
  public cost: number;

  @IsNumber()
  public expiresAt: number;
}

export default OfferDto;