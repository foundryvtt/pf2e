import { IWRApplication } from "@system/damage/iwr";
import { htmlQuery } from "@util";

export const DamageTaken = {
    listen: async (html: HTMLElement): Promise<void> => {
        const iwrInfo = htmlQuery(html, ".damage-taken .iwr");
        if (!iwrInfo) return;

        const iwrApplications = ((): IWRApplication[] | null => {
            try {
                const parsed = JSON.parse(iwrInfo?.dataset.applications ?? "null");
                return Array.isArray(parsed) &&
                    parsed.every(
                        (a: unknown): a is IWRApplication =>
                            a instanceof Object &&
                            "category" in a &&
                            typeof a.category === "string" &&
                            "type" in a &&
                            typeof a.type === "string" &&
                            "adjustment" in a &&
                            typeof a.adjustment === "number"
                    )
                    ? parsed
                    : null;
            } catch {
                return null;
            }
        })();

        if (iwrApplications) {
            $(iwrInfo).tooltipster({
                theme: "crb-hover",
                maxWidth: 400,
                content: await renderTemplate("systems/pf2e/templates/chat/damage/iwr-breakdown.hbs", {
                    applications: iwrApplications,
                }),
                contentAsHTML: true,
            });
        }
    },
};
