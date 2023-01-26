import { ErrorPF2e } from "@util";

export const MessageTooltips = {
    listen: ($html: JQuery): void => {
        const html = $html[0];

        // Remove entire .target-dc and .dc-result elements if they are empty after user-visibility processing
        const targetDC = html.querySelector<HTMLElement>(".target-dc");
        if (targetDC?.innerHTML.trim() === "") targetDC.remove();
        const dcResult = html.querySelector<HTMLElement>(".dc-result");
        if (dcResult?.innerHTML.trim() === "") dcResult.remove();

        // Check DC adjusted by circumstance bonuses or penalties
        try {
            const $adjustedDC = $html.find(".adjusted[data-circumstances]");
            if ($adjustedDC.length === 1) {
                const circumstances = JSON.parse($adjustedDC.attr("data-circumstances") ?? "");
                if (!Array.isArray(circumstances)) throw ErrorPF2e("Malformed adjustments array");

                const content = circumstances
                    .map((a: { label: string; value: number }) => {
                        const sign = a.value >= 0 ? "+" : "";
                        return $("<div>").text(`${a.label}: ${sign}${a.value}`);
                    })
                    .reduce(($concatted, $a) => $concatted.append($a), $("<div>"))
                    .prop("outerHTML");

                $adjustedDC.tooltipster({ content, contentAsHTML: true, theme: "crb-hover" });
            }
        } catch (error) {
            if (error instanceof Error) console.error(error.message);
        }

        // Adjusted check degree of success
        const $degreeOfSuccess = $html.find(".degree-of-success .adjusted");
        if ($degreeOfSuccess[0]?.dataset.adjustment) {
            $degreeOfSuccess.tooltipster({
                content: game.i18n.localize($degreeOfSuccess[0].dataset.adjustment),
                contentAsHTML: true,
                theme: "crb-hover",
            });
        }

        // Trait and material tooltips
        $html.find(".tag[data-material], .tag[data-slug], .tag[data-trait]").each((_idx, span) => {
            const $tag = $(span);
            const description = $tag.attr("data-description");
            if (description) {
                $tag.tooltipster({
                    content: game.i18n.localize(description),
                    maxWidth: 400,
                    theme: "crb-hover",
                });
            }
        });
    },
};
