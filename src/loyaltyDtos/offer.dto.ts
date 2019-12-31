import { IsString, IsNumber } from 'class-validator';

class OfferDto {
  @IsString()
  public description: string;

  @IsNumber()
  public cost: number;

  @IsString()
  public expiresAt: number;
}

export default OfferDto;
