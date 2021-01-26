import { IsString, IsOptional } from 'class-validator';

class OfferDto {
  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsOptional()
  @IsString()
  public subtitle: string;

  @IsString()
  public description: string;

  @IsOptional()
  @IsString()
  public instructions: string;

  @IsString()
  public cost: number;

  @IsString()
  public expiresAt: number;
}
export default OfferDto;
