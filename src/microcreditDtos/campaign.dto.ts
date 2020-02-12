import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

class CampaignDto {

  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsString()
  public terms: string;

  @IsString()
  public description: string;

  @IsString()
  public category: string;

  @IsString()
  public access: string;

  @IsString()
  public quantitative: boolean;

  @IsString()
  public minAllowed: number;
  @IsString()
  public maxAllowed: number;
  @IsString()
  public maxAmount: number;

  @IsString()
  public redeemStarts: number;
  @IsString()
  public redeemEnds: number;
  @IsString()
  public expiresAt: number;
}

export default CampaignDto;
