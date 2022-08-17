export const RenderJournalPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalPageSheet", (sheet, render) => {
            const pageEl = render.get(0)?.closest(".journal-entry-page");
            const entry = sheet.object.parent;
            const parentSheetClass = entry?.sheet.constructor as { theme?: string } | undefined;
            if (!parentSheetClass || !pageEl) return;

            const theme = parentSheetClass.theme ? String(parentSheetClass.theme) : null;
            if (!theme) return;

            // All pages regardless of type obtain the theme
            pageEl.classList.add(theme);

            // All text pages receive a .text-content css class to facilitate styling
            // We need to handle both prosemirror edit sheets and views in the journal entry
            // TinyMCE is handled separately
            if (sheet.object.type === "text") {
                pageEl.querySelector(".editor-content")?.classList.add("text-content");
                if (pageEl.tagName === "ARTICLE") {
                    const sectionEl = pageEl.querySelector(":scope > section");
                    sectionEl?.classList.add("text-content");
                }
            }
        });
    },
};
