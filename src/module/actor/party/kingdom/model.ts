import { createHTMLElement, fontAwesomeIcon } from "@util";
import { KingdomCHG, KingdomGovernment, KingdomSchema, KingdomSource } from "./data.ts";
import { KINGDOM_SCHEMA } from "./schema.ts";
import type { PartyPF2e } from "../document.ts";
import { ModelPropsFromSchema } from "types/foundry/common/data/fields.js";
import { PartyCampaign } from "../types.ts";
import { ItemType } from "@item/data/index.ts";
import { FeatGroup } from "@actor/character/feats.ts";
import { KINGDOM_ABILITIES } from "./values.ts";
import { resolveKingdomBoosts } from "./helpers.ts";
import { PartyCampaignSource } from "../data.ts";

const { DataModel } = foundry.abstract;

/** Model for the Kingmaker campaign data type, which represents a Kingdom */
class KingdomModel extends DataModel<null, KingdomSchema> implements PartyCampaign {
    declare feats: FeatGroup<PartyPF2e>;
    declare bonusFeats: FeatGroup<PartyPF2e>;

    static override defineSchema(): KingdomSchema {
        return KINGDOM_SCHEMA;
    }

    get extraItemTypes(): ItemType[] {
        return ["action", "feat"];
    }

    get charter(): KingdomCHG | null {
        return this.build.charter;
    }

    get heartland(): KingdomCHG | null {
        return this.build.heartland;
    }

    get government(): KingdomGovernment | null {
        return this.build.government;
    }

    constructor(private actor: PartyPF2e, source?: PartyCampaignSource) {
        super(source);
        this.#prepareAbilityScores();
        this.#prepareFeats();
    }

    /** Creates sidebar buttons to inject into the chat message sidebar */
    createSidebarButtons(): HTMLElement[] {
        // Do not show kingdom to party members until it becomes activated.
        if (!this.active && !game.user.isGM) return [];

        const icon = createHTMLElement("a", { children: [fontAwesomeIcon("crown", { fixedWidth: true })] });
        // todo: open sheet once clicked
        return [icon];
    }

    async update(data: DeepPartial<KingdomSource> & Record<string, unknown>): Promise<void> {
        await this.actor.update({ "system.campaign": data });
    }

    #prepareAbilityScores(): void {
        for (const ability of KINGDOM_ABILITIES) {
            this.abilities[ability].value = 10;
        }

        // Charter/Heartland/Government boosts
        for (const category of ["charter", "heartland", "government"] as const) {
            const data = this.build[category];
            const chosen = this.build.boosts[category];
            if (!data) continue;

            if (data.flaw) {
                this.abilities[data.flaw].value -= 2;
            }

            const activeBoosts = resolveKingdomBoosts(data, chosen);
            for (const ability of activeBoosts) {
                this.abilities[ability].value += this.abilities[ability].value >= 18 ? 1 : 2;
            }
        }

        // Level boosts
        const activeLevels = ([1, 5, 10, 15, 20] as const).filter((l) => this.level > l);
        for (const level of activeLevels) {
            const chosen = this.build.boosts[level].slice(0, 2);
            for (const ability of chosen) {
                this.abilities[ability].value += this.abilities[ability].value >= 18 ? 1 : 2;
            }
        }
    }

    #prepareFeats(): void {
        const { actor } = this;

        const evenLevels = new Array(actor.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);

        this.feats = new FeatGroup(actor, {
            id: "kingdom",
            label: "Kingdom Feats",
            slots: evenLevels,
            featFilter: ["traits-kingdom"],
        });

        this.bonusFeats = new FeatGroup(actor, {
            id: "bonus",
            label: "PF2E.FeatBonusHeader",
            featFilter: ["traits-kingdom"],
        });

        for (const feat of this.actor.itemTypes.feat) {
            if (!this.feats.assignFeat(feat)) {
                this.bonusFeats.assignFeat(feat);
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface KingdomModel extends ModelPropsFromSchema<KingdomSchema> {}

export { KingdomModel };
