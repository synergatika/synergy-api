import { IsString, IsOptional } from 'class-validator';

class PartnerID {
  @IsString()
  public partner_id: string;

  @IsOptional()
  @IsString()
  public offset: string;
}
export default PartnerID;
