import { IsEnum } from 'class-validator';

class PaymentDto {
  @IsEnum(['pay', 'unpay'])
  public payment: string;
}

export default PaymentDto;
