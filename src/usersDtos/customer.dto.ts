import { IsString } from 'class-validator';

class CustomerDto {
  @IsString()
  public name: string;

  @IsString()
  public imageURL: string;
}

export default CustomerDto;