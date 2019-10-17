import { IsEnum } from 'class-validator';

class EmailDto {
    @IsEnum(['customer', 'merchant'])
    public access: string;
}

export default EmailDto;