import { IsString, IsNumber } from 'class-validator';

class RedeemPointsDto {
    @IsString()
    public password: string;

    @IsString()
    public _to: string;

    @IsNumber()
    public _points: number;
}

export default RedeemPointsDto;