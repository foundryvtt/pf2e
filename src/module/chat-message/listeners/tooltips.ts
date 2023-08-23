import { ErrorPF2e, htmlQuery, htmlQueryAll } from "@util";

export const MessageTooltips = {
    listen: (html: HTMLElement): void => {
        // Remove entire .target-dc and .dc-result elements if they are empty after user-visibility processing
        const targetDC = htmlQuery(html, ".target-dc");
        if (targetDC?.innerHTML.trim() === "") targetDC.remove();
        const dcResult = htmlQuery(html, ".dc-result");
        if (dcResult?.innerHTML.trim() === "") dcResult.remove();

        // Check DC adjusted by circumstance bonuses or penalties
        try {
            const adjustedDCLabel = htmlQuery(html, ".adjusted[data-circumstances]");
            if (adjustedDCLabel) {
                const circumstances = JSON.parse(adjustedDCLabel.dataset.circumstances ?? "");
                if (!Array.isArray(circumstances)) throw ErrorPF2e("Malformed adjustments array");

                const content = circumstances
                    .map((a: { label: string; value: number }) => {
                        const sign = a.value >= 0 ? "+" : "";
                        return $("<div>").text(`${a.label}: ${sign}${a.value}`);
                    })
                    .reduce(($concatted, $a) => $concatted.append($a), $("<div>"))
                    .prop("outerHTML");

                $(adjustedDCLabel).tooltipster({ content, contentAsHTML: true, theme: "crb-hover" });
            }
        } catch (error) {
            if (error instanceof Error) console.error(error.message);
        }

        // Adjusted check degree of success
        const dosLabel = htmlQuery(html, ".degree-of-success .adjusted");
        if (dosLabel?.dataset.adjustment) {
            $(dosLabel).tooltipster({
                content: game.i18n.localize(dosLabel.dataset.adjustment),
                contentAsHTML: true,
                theme: "crb-hover",
            });
        }

        // Trait and material tooltips
        for (const tag of htmlQueryAll(html, ".tag[data-material], .tag[data-slug], .tag[data-trait]")) {
            const description = tag.dataset.description;
            if (description) {
                $(tag).tooltipster({
                    content: game.i18n.localize(description),
                    maxWidth: 400,
                    theme: "crb-hover",
                });
            }
        }
    },
};
