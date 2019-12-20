import { IsString, IsNumber } from 'class-validator';

class EarnPointsDto {
    @IsString()
    public password: string;

    @IsString()
    public _to: string;

    @IsNumber()
    public _amount: number;
}

export default EarnPointsDto;