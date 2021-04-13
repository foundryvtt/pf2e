import { ActorPF2e } from '@actor/base';
import { AreaEffectTemplate } from '../template';
import { AreaEffectPreview } from './base';

export class EmanationPreview extends AreaEffectPreview {
    constructor(template: AreaEffectTemplate, actor: ActorPF2e, token: Token) {
        super(template, actor, token);

        // Punch a hole in the template over the caster
        const hole = new PIXI.Graphics();
        hole.beginFill(0x000000, 1);

        hole.drawRect(token.x + 1, token.y + 1, token.width - 2, token.height - 2);
        hole.endFill();
        hole.blendMode = PIXI.BLEND_MODES.ERASE;

        const grid = canvas.grid;
        grid.addChild(hole);
        grid.filters = grid.filters
            ? grid.filters.concat(new PIXI.filters.AlphaFilter())
            : [new PIXI.filters.AlphaFilter()];
    }

    protected get startPosition() {
        return this.token.center;
    }

    /** @override */
    draw() {
        this.template.data.distance = this.template.effectArea.value * 1.5;
        super.draw();
    }
}
