import { AreaEffectPreview } from './base';

export class BurstPreview extends AreaEffectPreview {
    protected get startPosition() {
        return this.token.center;
    }

    protected get onMouseMove() {
        return (event: PIXI.interaction.InteractionEvent) => {
            event.stopPropagation();
        };
    }
}
