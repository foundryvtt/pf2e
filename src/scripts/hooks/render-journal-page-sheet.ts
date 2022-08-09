export const RenderJournalPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalPageSheet", (sheet, render) => {
            const entry = sheet.object.parent;
            const parentSheetClass = entry?.sheet.constructor as { theme?: string } | undefined;
            if (!parentSheetClass) return;

            const theme = parentSheetClass.theme ? String(parentSheetClass.theme) : null;
            if (theme && render.hasClass("sheet")) {
                render.addClass(theme);
            }
        });
    },
};
