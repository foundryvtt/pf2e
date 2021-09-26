export const PostConstantData = {
    listen: ($html: JQuery): void => {
        const $links = $html.find(".action-description, .editor-content");
        $links.each((_idx, link) => {
            link.innerHTML = TextEditor.enrichHTML(PostConstantData.postConstant(link.innerHTML));
        });
    },

    postConstant: (str: string): string => {
        return (
            str?.replace(/@Const\[([a-zA-Z0-9.]*)\]/g, (match, p1) => {
                match = match.concat("");
                return game.i18n.localize(p1);
            }) ?? undefined
        );
    },
};
