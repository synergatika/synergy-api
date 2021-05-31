import { IsString, IsOptional } from 'class-validator';

export class PartnerID {
  @IsString()
  public partner_id: string;

  @IsOptional()
  @IsString()
  public offset: string;
}