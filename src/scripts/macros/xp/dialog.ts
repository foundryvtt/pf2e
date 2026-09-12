import type { ActorPF2e, HazardPF2e } from "@actor";
import { isReallyPC } from "@actor/helpers.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { createHTMLElement, localizer } from "@util";
import * as R from "remeda";
import { rewardEncounterBudgets, xpCreatureDifferences, type XPCalculation } from "./index.ts";

/** Calculate and display XP for the selected tokens, prompting for party data if no PC tokens are selected */
async function xpFromEncounter(): Promise<void> {
    const actors: ActorPF2e[] = canvas.tokens.controlled
        .flatMap((t) => t.actor ?? [])
        .filter((a) => !a.traits.has("minion"));
    const npcLevels = actors.filter((a) => a.alliance === "opposition").map((a) => a.level);
    const hazards = actors.filter((a): a is HazardPF2e => a.type === "hazard");
    if (npcLevels.length === 0 && hazards.length === 0) {
        ui.notifications.error("PF2E.ErrorMessage.NoOppositionTokenSelected", { localize: true });
        return;
    }

    // Party level is the rounded mean of the selected PCs, matching encounter-tracker metrics
    const pcs = actors.filter((a) => a.alliance === "party" && isReallyPC(a));
    const party =
        pcs.length > 0
            ? { level: Math.round(R.meanBy(pcs, (a) => a.level)), size: pcs.length }
            : await askPartyLevelAndSize();
    if (!party) return;

    const pwol = game.pf2e.settings.variants.pwol.enabled;
    const xp = game.pf2e.gm.calculateXP(party.level, party.size, npcLevels, hazards, { pwol });
    new XPFromEncounterResults({ xp }).render({ force: true });
}

/** Prompt for party size and level, persisting the entries for future runs. Resolves null on cancel or dismissal. */
async function askPartyLevelAndSize(): Promise<{ level: number; size: number } | null> {
    const storedSize = Math.trunc(Number(localStorage.getItem("xpMacroPartySize") ?? 4));
    const storedLevel = Math.trunc(Number(localStorage.getItem("xpMacroPartyLevel") ?? 1));
    const content = `
        <div class="form-group">
            <label for="xp-party-size">${_loc("PF2E.Encounter.Budget.PartySize")}</label>
            <input type="number" id="xp-party-size" name="size" value="${storedSize}" min="1" step="1" autofocus />
        </div>
        <div class="form-group">
            <label for="xp-party-level">${_loc("PF2E.Encounter.Budget.PartyLevel")}</label>
            <input type="number" id="xp-party-level" name="level" value="${storedLevel}" min="1" step="1" />
        </div>`;
    const result: unknown = await fa.api.DialogV2.input({
        id: "xp-party-prompt-{id}",
        window: { title: "PF2E.Encounter.PartyInformation" },
        content,
        ok: { label: "PF2E.Encounter.CalculateXP", icon: "fa-solid fa-calculator" },
        buttons: [{ action: "cancel", label: "COMMON.Cancel", icon: "fa-solid fa-xmark" }],
    });
    // The cancel button resolves to its action string, dismissal to null
    if (!R.isPlainObject(result)) return null;

    const size = Math.abs(Math.trunc(Number(result.size) || 1));
    const level = Math.abs(Math.trunc(Number(result.level) || 1));
    localStorage.setItem("xpMacroPartySize", size.toString());
    localStorage.setItem("xpMacroPartyLevel", level.toString());
    return { level, size };
}

/** A static display of an XP calculation for the tokens selected when the macro was invoked */
class XPFromEncounterResults extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    // Definite-assignment: the constructor's early-return path never constructs an instance
    #xp!: XPCalculation;

    constructor(options: DeepPartial<fa.ApplicationConfiguration> & { xp: XPCalculation }) {
        // Reuse an open instance, replacing its data: a re-run refreshes the snapshot without moving the window
        const existing = foundry.applications.instances.get("xp-from-encounter");
        if (existing instanceof XPFromEncounterResults) {
            existing.#xp = options.xp;
            return existing;
        }
        super(options);
        this.#xp = options.xp;
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "xp-from-encounter",
        classes: ["scrollable-content"],
        window: { title: "PF2E.Encounter.XP" },
        position: { width: 480 },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: `systems/${SYSTEM_ID}/templates/macros/xp/results.hbs`, root: true, scrollable: [""] },
    };

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<XPFromEncounterContext> {
        const xp = this.#xp;
        return {
            ...(await super._prepareContext(options)),
            metrics: this.#prepareMetrics(),
            budgetRows: R.keys(rewardEncounterBudgets).map((rating) => ({
                threat: _loc(`PF2E.Encounter.Budget.Threats.${rating}`),
                budget: xp.encounterBudgets[rating],
                needed: xp.encounterBudgets[rating] - xp.totalXP,
                reward: rewardEncounterBudgets[rating],
            })),
            creatureRows: [...xpCreatureDifferences].map(([delta, creatureXP]) => ({
                level: xp.partyLevel + delta,
                xp: creatureXP,
                role: _loc(`PF2E.Encounter.CreatureXPAndRole.CreatureLevels.${delta}`),
            })),
        };
    }

    /** Threat/award/budget/party summary, in the same style as the encounter tracker's metrics */
    #prepareMetrics(): XPFromEncounterContext["metrics"] {
        const xp = this.#xp;
        const localize = localizer("PF2E.Encounter.Metrics");
        const threat = createHTMLElement("div", {
            innerHTML: localize("Threat", { threat: _loc(`PF2E.Encounter.Budget.Threats.${xp.rating}`) }),
        });
        TextEditorPF2e.convertXMLNode(threat, "threat", { classes: ["value", xp.rating] });
        const award = createHTMLElement("div", { innerHTML: localize("Award.Label", { xp: xp.xpPerPlayer }) });
        TextEditorPF2e.convertXMLNode(award, "award", { classes: ["value"] });

        return {
            threat: threat.innerHTML,
            award: award.innerHTML,
            budget: localize("Budget", {
                spent: xp.totalXP,
                max: xp.encounterBudgets.moderate,
                partyLevel: xp.partyLevel,
            }),
            partySize: localize("PartySize", { size: xp.partySize }),
        };
    }
}

interface XPFromEncounterContext extends fa.ApplicationRenderContext {
    metrics: { threat: string; award: string; budget: string; partySize: string };
    budgetRows: { threat: string; budget: number; needed: number; reward: number }[];
    creatureRows: { level: number; xp: number; role: string }[];
}

export { xpFromEncounter };
