class JournalPageSheetPF2e extends JournalTextPageSheet<JournalEntryPage> {
    override async _renderInner(data: Record<string, unknown>, options: RenderOptions): Promise<JQuery> {
        const jQuery = await super._renderInner(data, options);
        const editingHeader = jQuery[0].querySelector(".journal-header");
        const viewingHeader = jQuery[0].querySelector(":is(h1, h2, h3)");

        if (editingHeader) {
            const input = document.createElement("input");
            input.classList.add("title");
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

export { JournalPageSheetPF2e };
