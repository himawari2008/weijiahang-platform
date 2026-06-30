import { IsString, MinLength, MaxLength } from 'class-validator';

export class ReplyReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  replyContent: string;
}
