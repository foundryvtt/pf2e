import type { ApplicationConfiguration } from "@client/applications/_types.d.mts";
import { CharacterPF2e } from "@actor";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { adjustDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { signedInteger } from "@util";

import { getActions, loreSkillsFromActors } from "./helpers.ts";
import * as R from "remeda";
import Root from "./app.svelte";

class CheckPromptV2 extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        position: {
            width: 400,
            height: "auto" as "auto"
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

        const skills = {
                    ...R.mapValues(CONFIG.PF2E.skills, (s) => s.label),
                    perception: "PF2E.PerceptionLabel",
                };

        return {
            foundryApp: this,
            state: {
                actions: await getActions(),
                lores: loreSkillsFromActors(this.actors ?? game.actors.party?.members ?? []),
                proficiencyRanks: this.#prepareProficiencyRanks(),
                dcAdjustments: this.#prepareDCAdjustments(),
                partyLevel: game.actors.party?.level ?? null,
                skills,
            }
        }
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
}

interface CheckPromptV2Context extends SvelteApplicationRenderContext {
    state: CheckPromptV2State;
}

interface CheckPromptV2State {
    proficiencyRanks: SelectData[];
    dcAdjustments: SelectData[];
    partyLevel: number | null;
    actions: Record<string, string>;
    lores: Record<string, string>;
    skills: Record<string, string>;
}

interface SelectData {
    value: string;
    label: string;
}

export async function checkPromptV2(options: ActionDefaultOptions = {}): Promise<void> {
    new CheckPromptV2( { actors: options.actors as CharacterPF2e[] } ).render({force: true});
};
export type { CheckPromptV2Context };