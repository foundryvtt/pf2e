export class TileDocumentPF2e extends TileDocument {
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
