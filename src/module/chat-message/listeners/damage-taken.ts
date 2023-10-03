import { IWRApplication } from "@system/damage/iwr.ts";
import { htmlQuery } from "@util";
import { ChatMessagePF2e } from "../document.ts";

export const DamageTaken = {
    listen: async (message: ChatMessagePF2e, html: HTMLElement): Promise<void> => {
        const damageTakenCard = htmlQuery(html, ".damage-taken");
        if (!damageTakenCard) return;

        // Obscure target name if "tokenSetsNameVisibility" setting is enabled
        const settingEnabled = game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
        if (!game.user.isGM && settingEnabled && message.token && !message.token.playersCanSeeName) {
            const nameElem = htmlQuery(damageTakenCard, ".target-name");
            if (nameElem) nameElem.innerText = game.i18n.localize("PF2E.Actor.ApplyDamage.TheTarget");
        }

        // Add IWR-application tooltip
        const iwrInfo = htmlQuery(damageTakenCard, ".iwr");
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
