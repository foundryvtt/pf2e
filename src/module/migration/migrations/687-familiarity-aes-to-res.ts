import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { RawPredicate } from "@system/predication";
import { MigrationBase } from "../base";

/** Convert weapon familiarity `ActiveEffect`s to Rule Elements */
export class Migration687FamiliarityAEsToREs extends MigrationBase {
    static override version = 0.687;

    private isFamiliarityAE(data: unknown): data is AEFamiliarityValue {
        const dataIsFamiliarity = (obj: {
            trait?: unknown;
            category?: unknown;
        }): obj is { trait: string; category: string } =>
            typeof obj.trait === "string" && typeof obj.category === "string";
        return typeof data === "object" && data !== null && dataIsFamiliarity(data);
    }

    private toRuleElement(sameAs: string, aeValue: string): LinkedProficiencySource | null {
        const aeData = ((): AEFamiliarityValue | null => {
            try {
                const parsed = JSON.parse(aeValue);
                return this.isFamiliarityAE(parsed) ? parsed : null;
            } catch (error) {
                console.warn(error);
                return null;
            }
        })();
        return (
            aeData && {
                key: "LinkedProficiency",
                slug: `${aeData.category}-${aeData.trait}-weapons`,
                predicate: { all: [`weapon:trait:${aeData.trait}`, `weapon:category:${aeData.category}`] },
                sameAs,
            }
        );
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        actorSource.effects = [];
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        for (const effect of [...itemSource.effects]) {
            for (const change of effect.changes.filter((change) => change.key.startsWith("data.martial."))) {
                const linkTo = change.key.replace(/^data\.martial\.|\.familiarity$/g, "");
                const reData = this.toRuleElement(linkTo, change.value);
                if (reData) itemSource.data.rules.push(reData);
            }
        }
        itemSource.effects = [];
    }
}

interface AEFamiliarityValue {
    trait: string;
    category: string;
}

interface LinkedProficiencySource extends RuleElementSource {
    key: "LinkedProficiency";
    slug: string;
    predicate: RawPredicate;
    sameAs: string;
}
