import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TrainingCourse } from '../../database/entities/training-course.entity';
import { TrainingProgress } from '../../database/entities/training-progress.entity';

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingCourse)
    private readonly courseRepo: Repository<TrainingCourse>,
    @InjectRepository(TrainingProgress)
    private readonly progressRepo: Repository<TrainingProgress>,
  ) {}

  // Get all active courses
  async getCourses(): Promise<TrainingCourse[]> {
    return this.courseRepo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  // Get single course detail
  async getCourse(id: string): Promise<TrainingCourse> {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('课程不存在');
    return course;
  }

  // Get all progress records for a navigator
  async getNavigatorProgress(navigatorId: string): Promise<(TrainingProgress & { course?: TrainingCourse })[]> {
    const progress = await this.progressRepo.find({
      where: { navigatorId },
      order: { createdAt: 'DESC' },
    });

    // Attach course info
    const results: (TrainingProgress & { course?: TrainingCourse })[] = [];
    for (const p of progress) {
      const course = await this.courseRepo.findOne({ where: { id: p.courseId } }).catch(() => null);
      results.push(Object.assign(p, { course: course || undefined }));
    }
    return results;
  }

  // Update video watch progress
  async updateProgress(navigatorId: string, courseId: string, progress: number): Promise<TrainingProgress> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('课程不存在');

    let record = await this.progressRepo.findOne({ where: { navigatorId, courseId } });

    if (record) {
      record.progress = Math.min(100, progress);
      if (progress >= 100 && !record.completed) {
        record.completed = 1;
        record.completedAt = new Date();
      }
      return this.progressRepo.save(record as unknown as TrainingProgress);
    }

    const newRecord = this.progressRepo.create({
      navigatorId,
      courseId,
      progress: Math.min(100, progress),
      completed: progress >= 100 ? 1 : 0,
      completedAt: progress >= 100 ? new Date() : null,
      examScore: null,
      examPassed: 0,
    } as any);

    return this.progressRepo.save(newRecord as unknown as TrainingProgress);
  }

  // Submit exam and return score
  async submitExam(
    navigatorId: string,
    courseId: string,
    answers: number[],
  ): Promise<{ score: number; passed: boolean; totalQuestions: number; correctAnswers: number }> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('课程不存在');

    let record = await this.progressRepo.findOne({ where: { navigatorId, courseId } });
    if (!record) {
      const newRecord = this.progressRepo.create({
        navigatorId,
        courseId,
        progress: 0,
        completed: 0,
        examScore: null,
        examPassed: 0,
      } as any);
      record = await this.progressRepo.save(newRecord as unknown as TrainingProgress);
    }

    // Use course category as seed for correct answers (simplified)
    // In production, each course would have stored correct answers
    const totalQuestions = 10;
    const correctAnswers = answers.filter(a => a === 1).length; // Simplification: answer 1 is always correct
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 60;

    record.examScore = score;
    record.examPassed = passed ? 1 : 0;
    await this.progressRepo.save(record as unknown as TrainingProgress);

    return { score, passed, totalQuestions, correctAnswers };
  }

  // Get pass rate for a navigator
  async getPassRate(navigatorId: string): Promise<{ percentage: number; passed: number; total: number }> {
    const records = await this.progressRepo.find({ where: { navigatorId } });
    const total = records.length;
    const passed = records.filter(r => r.examPassed === 1).length;
    return {
      percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
      passed,
      total,
    };
  }
}
