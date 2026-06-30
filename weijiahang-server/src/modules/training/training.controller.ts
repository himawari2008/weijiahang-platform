import { Controller, Get, Put, Post, Param, Body, Query } from '@nestjs/common';
import { TrainingService } from './training.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  /** 课程列表 — 公开 */
  @Public()
  @Get('courses')
  async getCourses() {
    return this.trainingService.getCourses();
  }

  /** 课程详情 — 公开 */
  @Public()
  @Get('courses/:id')
  async getCourse(@Param('id') id: string) {
    return this.trainingService.getCourse(id);
  }

  /** 学员学习进度 — 需登录 */
  @Get('progress/:navigatorId')
  async getProgress(@Param('navigatorId') navigatorId: string) {
    return this.trainingService.getNavigatorProgress(navigatorId);
  }

  /** 更新学习进度 — 需登录 */
  @Put('progress/:navigatorId/:courseId')
  async updateProgress(
    @Param('navigatorId') navigatorId: string,
    @Param('courseId') courseId: string,
    @Body('progress') progress: number,
  ) {
    return this.trainingService.updateProgress(navigatorId, courseId, progress);
  }

  /** 提交考试 — 需登录 */
  @Post('exam/:navigatorId/:courseId')
  async submitExam(
    @Param('navigatorId') navigatorId: string,
    @Param('courseId') courseId: string,
    @Body() body: { answers: number[] },
  ) {
    return this.trainingService.submitExam(navigatorId, courseId, body.answers || []);
  }
}
