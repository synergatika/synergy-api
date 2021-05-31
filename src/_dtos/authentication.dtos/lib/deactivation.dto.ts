import { IsString, IsOptional } from 'class-validator';

export class DeactivationDto {
  @IsOptional()
  @IsString()
  public reason: string;
}