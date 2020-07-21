import { IsString, IsOptional } from 'class-validator';

class CampaignDto {

  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsOptional()
  @IsString()
  public subtitle: string;

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

  @IsOptional()
  @IsString()
  public stepAmount: number;

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
  public startsAt: number;

  @IsString()
  public expiresAt: number;
}
export default CampaignDto;
