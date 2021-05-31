import { IsString, IsArray } from 'class-validator';

export class SectorDto {
  @IsString()
  public _id: string;

  @IsString()
  public slug: string;

  @IsString()
  public el_title: string;

  @IsString()
  public en_title: string;
}

export class SectorsDto {
  @IsArray()
  public sectors: SectorDto[];
}
