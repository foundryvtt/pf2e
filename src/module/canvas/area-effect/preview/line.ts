import { AreaEffectPreview } from './base';

export class LinePreview extends AreaEffectPreview {
    protected get startPosition() {
        return this.token;
    }

    protected get onMouseMove() {
        return (event: PIXI.interaction.InteractionEvent) => {
            event.stopPropagation();
        };
    }
}
