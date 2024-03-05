import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";
import { sluggify } from "@util";

export class Migration927RitualSecondaryCasters extends MigrationBase {
    static override version = 0.927;

    #RITUALCASTERSREPLACEMENT = new Map<string, NewCasters>([
        [
            "demonic-pact",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "amity-cycle",
            {
                min: 3,
                max: null,
                details: "",
            },
        ],
        [
            "angelic-messenger",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "asmodean-wager",
            {
                min: 1,
                max: 9,
                details: "",
            },
        ],
        [
            "aspirational-state",
            {
                min: 2,
                max: 2,
                details: "3 for groups of 6 PCs",
            },
        ],
        [
            "atone",
            {
                min: 1,
                max: 1,
                details: "must be the ritual's target",
            },
        ],
        [
            "awaken-portal",
            {
                min: 0,
                max: 5,
                details: "",
            },
        ],
        [
            "community-repair",
            {
                min: 4,
                max: null,
                details: "",
            },
        ],
        [
            "concealments-curtain",
            {
                min: 3,
                max: 3,
                details: "",
            },
        ],
        [
            "consecrate",
            {
                min: 2,
                max: 2,
                details: "must be worshippers of your religion",
            },
        ],
        [
            "contact-friends",
            {
                min: 1,
                max: null,
                details: "",
            },
        ],
        [
            "corpse-communion",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "daemonic-pact",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "diabolic-pact",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "div-pact",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "elemental-sentinel",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "extract-brain",
            {
                min: 0,
                max: null,
                details: "",
            },
        ],
        [
            "harrowing",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "infernal-pact",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "inveigle",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "last-nights-vigil",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "mosquito-blight",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "mystic-carriage",
            {
                min: 1,
                max: 1,
                details: "",
            },
        ],
        [
            "planar-ally",
            {
                min: 2,
                max: 2,
                details: "must share your religion",
            },
        ],
        [
            "purify-soul-path",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "ravenous-reanimation",
            {
                min: 0,
                max: 0,
                details: "",
            },
        ],
        [
            "rite-of-repatriation",
            {
                min: 0,
                max: 5,
                details: "",
            },
        ],
        [
            "rite-of-the-red-star",
            {
                min: 1,
                max: null,
                details: "the maximum is limited only by the physical space within the ring of stones",
            },
        ],
        [
            "tattoo-whispers",
            {
                min: 2,
                max: 6,
                details: "",
            },
        ],
        [
            "the-worlds-a-stage",
            {
                min: 2,
                max: 12,
                details: "",
            },
        ],
        [
            "unfettered-mark",
            {
                min: 0,
                max: 10,
                details: "",
            },
        ],
        [
            "winters-breath",
            {
                min: 1,
                max: 1,
                details: "",
            },
        ],
    ]);

    #updateRitualCasters(oldCasters: number, slug: string): NewCasters {
        if (oldCasters > 0) {
            // If the number was greater than zero, it actually was correctly converted from the original text
            // If it is a user-made ritual, it should transfer as-is.
            return { min: oldCasters, max: oldCasters, details: "" };
        }
        const newCasters = this.#RITUALCASTERSREPLACEMENT.get(slug);
        // If we don't have replacement values for the slug, just return default
        return newCasters ? R.clone(newCasters) : { min: 0, max: null, details: "" };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const system: MaybeOldSpellSystemSource = source.system ?? {};

        if ("ritual" in source.system && R.isObjectType(source.system.ritual)) {
            const slug = source.system.slug ?? sluggify(source.name);
            const ritual: MaybeOldRitualData = system.ritual ?? {};
            if (R.isObjectType(ritual.secondary) && R.isNumber(ritual.secondary.casters)) {
                if (slug === "concealments-curtain") ritual.secondary.checks = "Arcana, Deception, Stealth";
                const newCasters = this.#updateRitualCasters(ritual.secondary.casters, slug);
                source.system.ritual.secondary.casters = newCasters;
            }
        }
    }
}

interface MaybeOldRitualData {
    primary?: { check: string };
    secondary?: { checks: string; casters: number };
}

interface NewCasters {
    min: number;
    max: number | null;
    details: string;
}

type MaybeOldSpellSystemSource = Omit<DeepPartial<SpellSystemSource>, "ritual"> & {
    ritual?: unknown;
};
