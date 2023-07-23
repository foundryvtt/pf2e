import { ActorSourcePF2e } from "@actor/data/index.ts";
import { FeatPF2e } from "@item";
import { EffectSource, ItemSourcePF2e } from "@item/data/index.ts";
import { UUIDUtils } from "@util/uuid.ts";
import { MigrationBase } from "../base.ts";

/** Update feats, items, and rule elements to accurately process cumulative item bonuses */
export class Migration723CumulativeItemBonuses extends MigrationBase {
    static override version = 0.723;

    /** Feat items: Animal Skin, Mountance Stance, Mountance Quake, and Mountance Stronghold */
    private stanceFeats = (async (): Promise<Record<string, FeatPF2e | undefined>> => {
        const documents: ClientDocument[] = await UUIDUtils.fromUUIDs([
            "Compendium.pf2e.feats-srd.ZPclfDmiHzEqblry", // Animal Skin
            "Compendium.pf2e.feats-srd.ZL5UU9quCTvcWzfY", // Mountain Stance
            "Compendium.pf2e.feats-srd.n2hawNmzW7DBn1Lm", // Mountain Stronghold
            "Compendium.pf2e.feats-srd.hO4sKslTrSQMLbGx", // Mountain Quake
        ]);

        const feats = documents.filter((d): d is FeatPF2e & { slug: string } => d instanceof FeatPF2e && !!d.slug);
        return feats.reduce((record: Record<string, FeatPF2e>, f) => ({ ...record, [f.slug]: f }), {});
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
                    const feat = (await this.stanceFeats)[source.system.slug];
                    if (feat) source.system.rules = feat.toObject().system.rules;
                } else if (this.mountainPattern.test(source.system.slug)) {
                    const feat = (await this.stanceFeats)[source.system.slug];
                    if (feat) source.system.description.value = feat.description;
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
            source.command = String.raw`const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
if (actors.length === 0 && game.user.character) actors.push(game.user.character);
if (actors.length === 0) {
    const message = game.i18n.localize("PF2E.ErrorMessage.NoTokenSelected");
    return ui.notifications.error(message);
}

const ITEM_UUID = "Compendium.pf2e.feat-effects.gYpy9XBPScIlY93p"; // Stance: Mountain Stance
const source = (await fromUuid(ITEM_UUID)).toObject();
source.flags = mergeObject(source.flags ?? {}, { core: { sourceId: ITEM_UUID } });

for (const actor of actors) {
    const existing = actor.itemTypes.effect.find((e) => e.flags.core?.sourceId === ITEM_UUID);
    if (existing) {
        await existing.delete();
    } else {
        await actor.createEmbeddedDocuments("Item", [source]);
    }
}`;
        }
    }
}
