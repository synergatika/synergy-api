import { IsArray, ValidateNested } from 'class-validator';

class PartnerPaymentDto {
    bic: string;
    name: string;
    value: string;
  }

export class PartnerPaymentsDto {
    @IsArray()
    @ValidateNested({ each: true })
    public payments: PartnerPaymentDto[];
}