class NoteDocumentPF2e extends NoteDocument {
    constructor(data: object, context?: DocumentConstructionContext<TParent>) {
        super(data, context);
        // At Setup hook, this.page throws an error because game.journal is undefined
        if (this.page?.system.code) {
            this.texture.src = "code";
            this.iconSize = 60;
        }
    }

    override get entry(): Journal {
        return game.journal?.get(this.entryId);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        const code = this.page?.system.code ?? "";
        this.flags = fu.mergeObject(
            {
                pf2e: {
                    code,
                },
            },
            this.flags,
        );
    }
}

export { NoteDocumentPF2e };
