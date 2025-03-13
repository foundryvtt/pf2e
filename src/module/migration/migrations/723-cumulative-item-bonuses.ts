import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { EffectSource, FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";
import { getCompendiumSources } from "../helpers.ts";

/** Update feats, items, and rule elements to accurately process cumulative item bonuses */
export class Migration723CumulativeItemBonuses extends MigrationBase {
    static override version = 0.723;

    /** Feat items: Animal Skin, Mountance Stance, Mountance Quake, and Mountance Stronghold */
    private stanceFeats = ((): Record<string, FeatSource> => {
        const sources = getCompendiumSources<FeatSource>([
            "Compendium.pf2e.feats-srd.ZPclfDmiHzEqblry", // Animal Skin
            "Compendium.pf2e.feats-srd.ZL5UU9quCTvcWzfY", // Mountain Stance
            "Compendium.pf2e.feats-srd.n2hawNmzW7DBn1Lm", // Mountain Stronghold
            "Compendium.pf2e.feats-srd.hO4sKslTrSQMLbGx", // Mountain Quake
        ]);
        return Object.fromEntries(sources.map((f) => [f.system.slug ?? sluggify(f.name), f]));
    })();

    /** Slug pattern for the same */
    private mountainPattern = /^mountain-(?:stance|stronghold|quake)$/;

    /** Remove old Mountain Stance effects */
    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const effects = source.items.filter((i): i is EffectSource => i.type === "effect");
        for (const effect of effects) {
            if (effect.system.slug?.startsWith("stance-mountain")) {
                source.items.findSplice((i) => i === effect);
            }
        }
    }

    /** Update feat, effect, and equipment items */
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.slug) return;

        switch (source.type) {
            case "feat": {
                if (source.system.slug === "animal-skin") {
                    const feat = this.stanceFeats[source.system.slug];
                    if (feat) source.system.rules = feat.system.rules;
                } else if (this.mountainPattern.test(source.system.slug)) {
                    const feat = this.stanceFeats[source.system.slug];
                    if (feat) source.system.description.value = feat.system.description.value;
                }
                return;
            }
            case "equipment": {
                if (!source.system.slug.startsWith("bracers-of-armor-")) return;

                for (const rule of source.system.rules) {
                    if (rule.key === "FlatModifier") rule.slug = "bracers-of-armor";
                }
                return;
            }
            case "effect": {
                if (source.system.slug !== "spell-effect-mage-armor") return;

                for (const rule of source.system.rules) {
                    if (rule.key === "FlatModifier") rule.slug = "mage-armor";
                }
            }
        }
    }

    /** Replace the retired toggle macro with a simple hotbar-drop effect macro */
    override async updateMacro(source: foundry.documents.MacroSource): Promise<void> {
        if (source.type === "script" && source.command.includes("Stance: Mountain Stance")) {
            source.command = String.raw`const actors = game.user.getActiveTokens().flatMap((t) => t.actor ?? []);
if (actors.length === 0) {
    return ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
}

const ITEM_UUID = "Compendium.pf2e.feat-effects.gYpy9XBPScIlY93p"; // Stance: Mountain Stance
const source = (await fromUuid(ITEM_UUID)).toObject();
source.flags = mergeObject(source.flags ?? {}, { core: { sourceId: ITEM_UUID } });

for (const actor of actors) {
    const existing = actor.itemTypes.effect.find((e) => e._stats.compendiumSource === ITEM_UUID);
    if (existing) {
        await existing.delete();
    } else {
        await actor.createEmbeddedDocuments("Item", [source]);
    }
}`;
        }
    }
}
