import { IsString, IsNumber } from 'class-validator';

export class EarnPointsDto {
    @IsNumber()
    public _amount: number;
}