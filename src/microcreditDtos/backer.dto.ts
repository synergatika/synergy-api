import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

class BackerDto {

  @IsNumber()
  public amount: number;

}

export default BackerDto;
