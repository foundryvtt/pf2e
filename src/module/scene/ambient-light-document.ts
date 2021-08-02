import { AmbientLightPF2e } from "@module/canvas";
import { ScenePF2e } from ".";

export class AmbientLightDocumentPF2e extends AmbientLightDocument {
    /** Is this light actually a source of darkness? */
    get isDarkness(): boolean {
        return this.object.source.isDarkness;
    }

    protected override _onCreate(
        data: this["data"]["_source"],
        options: SceneEmbeddedModificationContext,
        userId: string
    ) {
        super._onCreate(data, options, userId);
        canvas.darkvision.draw();
    }

    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: SceneEmbeddedModificationContext,
        userId: string
    ) {
        super._onUpdate(changed, options, userId);
        canvas.darkvision.draw();
    }

    protected override _onDelete(options: SceneEmbeddedModificationContext, userId: string) {
        super._onDelete(options, userId);
        canvas.darkvision.draw();
    }
}

export interface AmbientLightDocumentPF2e extends AmbientLightDocument {
    readonly data: foundry.data.AmbientLightData<AmbientLightDocumentPF2e>;

    readonly parent: ScenePF2e | null;

    get object(): AmbientLightPF2e;
}
