import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GenerateStoryboardDto, PlanKeyframesDto } from './dto';
import { StoryboardService } from './storyboard.service';

@Controller('/api')
export class StoryboardController {
  constructor(private readonly svc: StoryboardService) {}

  @Post('/storyboard/generate')
  async generate(@Body() body: any) {
    const input = GenerateStoryboardDto.parse(body);
    return this.svc.generateStoryboard(input);
  }

  @Get('/projects/:projectId')
  getProject(@Param('projectId') projectId: string) {
    return this.svc.getProject(projectId);
  }

  @Post('/projects/:projectId/shots/:shotId/keyframes/plan')
  async plan(@Param('projectId') projectId: string, @Param('shotId') shotId: string, @Body() body: any) {
    PlanKeyframesDto.parse(body);
    return this.svc.planKeyframes(projectId, shotId);
  }
}
