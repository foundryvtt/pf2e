class JournalMapLocationPageSheet extends JournalTextPageSheet<JournalEntryPage> {
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("map");
        return options;
    }

    override get template(): string {
        return `templates/journal/page-text-${this.isEditable ? "edit" : "view"}.html`;
    }

    override async _renderInner(data: Record<string, unknown>, options: RenderOptions): Promise<JQuery> {
        const jQuery = await super._renderInner(data, options);
        const editingHeader = jQuery[0].querySelector(".journal-header");
        const viewingHeader = jQuery[0].querySelector(":is(h1, h2, h3)");

        if (editingHeader) {
            const input = document.createElement("input");
            input.name = "system.code";
            input.type = "text";
            input.value = this.document.system.code ?? "";
            editingHeader.insertAdjacentElement("afterbegin", input);
        } else if (viewingHeader && this.document.system.code) {
            viewingHeader.dataset.mapLocationCode = this.document.system.code;
        }

        return jQuery;
    }
}

export { JournalMapLocationPageSheet };
