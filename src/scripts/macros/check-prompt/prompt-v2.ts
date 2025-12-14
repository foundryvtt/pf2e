import type { ApplicationConfiguration } from "@client/applications/_types.d.mts";
import { CharacterPF2e } from "@actor";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { adjustDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { signedInteger } from "@util";

import Root from "./app.svelte";

class CheckPromptV2 extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        position: {
            width: 400,
            height: "auto" as const,
        },
        window: {
            icon: "fa-solid fa-dice-d20",
            title: "PF2E.Actor.Party.CheckPrompt.Title",
            resizable: false,
        },
    };

    protected override root = Root;

    actors: CharacterPF2e[];

    constructor(options: DeepPartial<ApplicationConfiguration> & { actors: CharacterPF2e[] }) {
        super(options);
        this.actors = options.actors;
    }

    protected override async _prepareContext(): Promise<CheckPromptV2Context> {
        const actions = (await game.packs.get("pf2e.actionspf2e")?.getIndex({ fields: ["system.slug"] }))?.map((a) => {
            return {
                value: this.#formatActionType(a.system.slug),
                label: a.name,
            };
        });

        const skills: SelectData[] = Object.entries(CONFIG.PF2E.skills).map(([k, v]) => {
            return { value: k, label: game.i18n.localize(v.label) };
        });

        const lores: SelectData[] = (this.actors ?? game.actors.party?.members ?? null)
            .filter((a): a is CharacterPF2e => a?.type === "character")
            .flatMap((m) => Object.values(m.skills))
            .filter((s) => s.lore)
            .map((s) => {
                return {
                    value: this.#formatLoreType(s.slug),
                    label: s.label,
                };
            });

        const saves: SelectData[] = Object.entries(CONFIG.PF2E.saves).map(([k, v]) => {
            return { value: k, label: game.i18n.localize(v) };
        });

        const traits: SelectData[] = Object.entries(CONFIG.PF2E.actionTraits).map(([k, v]) => {
            return { value: k, label: game.i18n.localize(v) };
        });

        return {
            foundryApp: this,
            state: {
                actions: actions ?? [],
                lores,
                proficiencyRanks: this.#prepareProficiencyRanks(),
                dcAdjustments: this.#prepareDCAdjustments(),
                partyLevel: game.actors.party?.level ?? null,
                skills,
                saves,
                traits,
            },
        };
    }

    #prepareProficiencyRanks(): SelectData[] {
        const pwol = game.pf2e.settings.variants.pwol.enabled;
        return PROFICIENCY_RANKS.map((value) => ({
            value,
            label: `${value} (${calculateSimpleDC(value, { pwol })})`,
        }));
    }

    #prepareDCAdjustments(): SelectData[] {
        return Object.entries(CONFIG.PF2E.dcAdjustments)
            .filter(([value, _]) => value !== "normal")
            .map(([value, name]) => {
                return {
                    value,
                    label: `${game.i18n.localize(name)} (${signedInteger(adjustDC(0, value as DCAdjustment))})`,
                };
            });
    }

    #formatLoreType(type: string): string {
        let loreType = type.toLowerCase().replaceAll(" ", "-").trim();
        if (!loreType.includes("lore")) loreType = loreType.concat("-lore");
        return loreType;
    }

    #formatActionType(type: string): string {
        return `action:${type.toLowerCase().replace("action:", "").trim()}`;
    }
}

interface CheckPromptV2Context extends SvelteApplicationRenderContext {
    state: CheckPromptV2State;
}

interface CheckPromptV2State {
    proficiencyRanks: SelectData[];
    dcAdjustments: SelectData[];
    partyLevel: number | null;
    actions: SelectData[];
    lores: SelectData[];
    skills: SelectData[];
    saves: SelectData[];
    traits: SelectData[];
}

interface SelectData {
    value: string;
    label: string;
}

export async function checkPromptV2(options: ActionDefaultOptions = {}): Promise<void> {
    new CheckPromptV2({ actors: options.actors as CharacterPF2e[] }).render({ force: true });
}
export type { CheckPromptV2Context };
