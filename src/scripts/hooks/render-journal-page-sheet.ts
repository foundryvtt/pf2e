export const RenderJournalPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalPageSheet", (sheet, $html) => {
            const pageEl = $html.get(0)?.closest(".journal-entry-page");
            const entry = sheet.object.parent;
            const parentSheetClass = entry?.sheet.constructor as { theme?: string } | undefined;
            if (!parentSheetClass || !pageEl) return;

            const theme = parentSheetClass.theme ? String(parentSheetClass.theme) : null;
            if (theme) {
                // All pages regardless of type obtain the theme
                pageEl.classList.add(theme);
            }
        });
    },
};
