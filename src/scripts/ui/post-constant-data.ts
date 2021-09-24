import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";

export const PostConstantData = {
    listen: ($html: JQuery): void => {
        const $links = $html.find("span, p, div").filter("[data-pf2-const]");
        $links.each((_idx, link) => {
            const pf2Const = link?.dataset.pf2Const ?? "";
            if (pf2Const == "text" || pf2Const == "") link.innerHTML = TextEditor.enrichHTML(game.i18n.localize(link.innerHTML));

        });
        InlineRollsLinks.listen($links);
    },
};