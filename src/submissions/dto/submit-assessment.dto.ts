import {
  IsEnum,
  IsInt,
  IsObject,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AgeGroup, Language } from '@prisma/client';


class AnswerDto {
  @IsInt({ message: 'Answer must be an integer' })
  @Min(0, { message: 'Answer cannot be lower than 0' })
  @Max(5, { message: 'Answer cannot be higher than 5' })
  question1: number;

  @IsInt()
  @Min(0)
  @Max(5)
  question2: number;

  @IsInt()
  @Min(0)
  @Max(5)
  question3: number;

  @IsInt()
  @Min(0)
  @Max(5)
  question4: number;

  @IsInt()
  @Min(0)
  @Max(5)
  question5: number;
}


export class SubmitAssessmentDto {
  @IsObject()
  @ValidateNested()
  @Type(() => AnswerDto)
  responses: AnswerDto;

  // ---- Language (exact spelling) ----
  @Transform(({ value }) => Language[value as keyof typeof Language])
  @IsEnum(Language, {
    message: `language must be one of: ${Object.values(Language).join(', ')}`,
  })
  language: Language;

  // ---- AgeGroup (exact spelling) ----
  @Transform(({ value }) => AgeGroup[value as keyof typeof AgeGroup])
  @IsEnum(AgeGroup, {
    message: `ageGroup must be one of: ${Object.values(AgeGroup).join(', ')}`,
  })
  ageGroup: AgeGroup;
}