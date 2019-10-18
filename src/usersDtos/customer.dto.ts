import { IsString, IsOptional } from 'class-validator';

class CustomerDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public imageURL: string;
}

export default CustomerDto;
