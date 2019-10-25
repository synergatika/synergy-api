import { IsString, IsNumber } from 'class-validator';

class RedeemPointsDto {
    @IsString()
    public _from: string;

    @IsString()
    public _to: string;

    @IsNumber()
    public _points: number;
}

export default RedeemPointsDto;