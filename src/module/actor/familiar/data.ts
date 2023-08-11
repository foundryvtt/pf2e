import {
    BaseCreatureSource,
    CreatureAttributes,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
} from "@actor/creature/data.ts";
import type { CreatureSensePF2e } from "@actor/creature/sense.ts";
import { AttributeString } from "@actor/types.ts";
import type { Statistic } from "@system/statistic/index.ts";

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

interface FamiliarSystemSource extends Pick<CreatureSystemSource, "schema"> {
    details: {
        creature: {
            value: string;
        };
    };
    attributes: FamiliarAttributesSource;
    master: {
        id: string | null;
        ability: AttributeString | null;
    };

    customModifiers?: never;

    resources?: never;

    traits?: never;
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData
    extends Omit<FamiliarSystemSource, "attributes" | "customModifiers" | "toggles" | "resources" | "traits">,
        CreatureSystemData {
    details: CreatureSystemData["details"] & {
        creature: {
            value: string;
        };
    };
    actions?: never;
    attack: Statistic;
    attributes: FamiliarAttributes;
    master: {
        id: string | null;
        ability: AttributeString | null;
    };
    traits: FamiliarTraitsData;
}

interface FamiliarAttributesSource {
    hp: { value: number };
    initiative?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    initiative?: never;
}

interface FamiliarTraitsData extends CreatureTraitsData {
    senses: CreatureSensePF2e[];
}

export { FamiliarSource, FamiliarSystemData, FamiliarSystemSource };
