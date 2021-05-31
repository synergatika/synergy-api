import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class EarnTokensDto {
  @IsNumber()
  public _amount: number;

  @IsString()
  public method: string;

  @IsOptional()
  @IsBoolean()
  public paid: boolean;
}