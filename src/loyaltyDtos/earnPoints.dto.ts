import { IsString, IsNumber } from 'class-validator';

class EarnPointsDto {
    @IsString()
    public password: string;

    @IsNumber()
    public _amount: number;
}

export default EarnPointsDto;