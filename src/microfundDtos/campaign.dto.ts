import { IsString } from 'class-validator';

class CampaignDto {
  @IsString()
  public description: string;

  @IsString()
  public expiresAt: Date;
}

export default CampaignDto;