import { IsString } from 'class-validator';

export class IdentifierDto {
  @IsString()
  public identifier: string;
}