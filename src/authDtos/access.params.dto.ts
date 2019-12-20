import { IsEnum } from 'class-validator';

class AccessDto {
    @IsEnum(['customer', 'merchant'])
    public access: string;
}

export default AccessDto;