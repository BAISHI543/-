import { Body, Controller, Param, Post } from '@nestjs/common';
import { RenderKeyframeDto } from './dto';
import { RenderService } from './render.service';

@Controller('/api')
export class RenderController {
  constructor(private readonly svc: RenderService) {}

  @Post('/projects/:projectId/keyframes/:keyframeId/render')
  async render(
    @Param('projectId') projectId: string,
    @Param('keyframeId') keyframeId: string,
    @Body() body: any
  ) {
    RenderKeyframeDto.parse(body);
    return this.svc.renderKeyframe({ projectId, keyframeId });
  }

  @Post('/projects/:projectId/shots/:shotId/render-3')
  async render3(@Param('projectId') projectId: string, @Param('shotId') shotId: string, @Body() body: any) {
    RenderKeyframeDto.parse(body);
    return this.svc.renderShot3({ projectId, shotId });
  }
}
