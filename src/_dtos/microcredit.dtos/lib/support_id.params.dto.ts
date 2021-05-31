import { IsString, IsOptional } from 'class-validator';

export class SupportID {
  @IsString()
  public partner_id: string;

  @IsString()
  public campaign_id: string;

  @IsOptional()
  @IsString()
  public support_id: string;
}