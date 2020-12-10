import { IsArray, ValidateNested } from 'class-validator';
import PartnerPayment from '../usersInterfaces/partner_payment.interface'

class PartnerPaymentsDto {
    @IsArray()
    @ValidateNested({ each: true })
    public payments: PartnerPayment[];
}
export default PartnerPaymentsDto;