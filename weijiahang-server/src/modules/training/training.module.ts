import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingCourse } from '../../database/entities/training-course.entity';
import { TrainingProgress } from '../../database/entities/training-progress.entity';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingCourse, TrainingProgress]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
