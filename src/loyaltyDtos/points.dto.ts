import { IsString, IsNumber } from 'class-validator';

class PointsDto {
    @IsString()
    public _from: string;

    @IsString()
    public _to: string;

    @IsNumber()
    public _value: number;
}

export default PointsDto;