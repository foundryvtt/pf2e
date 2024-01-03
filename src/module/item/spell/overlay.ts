import type { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import type { SpellOverlay, SpellOverlayType, SpellSource } from "./data.ts";
import type { SpellPF2e } from "./document.ts";

class SpellOverlayCollection extends Collection<SpellOverlay> {
    readonly spell: SpellPF2e;

    constructor(spell: SpellPF2e, entries?: Record<string, SpellOverlay>) {
        super(Object.entries(entries ?? {}));
        this.spell = spell;
    }

    /** Returns all variants based on override overlays */
    get overrideVariants(): SpellPF2e[] {
        return [...this.entries()].reduce((result: SpellPF2e[], [overlayId, data]) => {
            if (data.overlayType === "override") {
                const spell = this.spell.loadVariant({ overlayIds: [overlayId] });
                if (spell) return [...result, spell];
            }
            return result;
        }, []);
    }

    getType(overlayId: string): SpellOverlayType {
        return this.get(overlayId, { strict: true }).overlayType;
    }

    async create(
        overlayType: SpellOverlayType,
        options: { renderSheet: boolean } = { renderSheet: false },
    ): Promise<void> {
        const id = fu.randomID();

        switch (overlayType) {
            case "override":
                await this.spell.update({
                    [`system.overlays.${id}`]: {
                        _id: id,
                        sort: this.overrideVariants.length + 1,
                        overlayType: "override",
                        system: {},
                    },
                });
                if (options.renderSheet) {
                    const variantSpell = this.spell.loadVariant({ overlayIds: [id] });
                    if (variantSpell) {
                        variantSpell.sheet.render(true);
                    }
                }
                break;
        }
    }

    async updateOverride<TSpell extends SpellPF2e>(
        variantSpell: TSpell,
        data: Partial<SpellSource>,
        options?: DocumentModificationContext<ActorPF2e>,
    ): Promise<TSpell | null> {
        const variantId = variantSpell.variantId;
        if (!variantId) return null;

        // Perform local data update of spell variant data
        variantSpell.updateSource(data, options);

        // Diff data and only save the difference
        const variantSource = R.omit(variantSpell.toObject(), ["_stats"]);
        const originSource = R.omit(this.spell.toObject(), ["_stats"]);
        const difference = fu.diffObject<DeepPartial<SpellSource> & { overlayType: string }>(
            originSource,
            variantSource,
        );

        if (Object.keys(difference).length === 0) return variantSpell;

        // Always remove the spell description if it makes it this far
        delete difference.system?.description;
        // Restore overlayType
        difference.overlayType = "override";

        // Delete old entry to ensure clean data
        await this.spell.update(
            {
                [`system.overlays.-=${variantId}`]: null,
            },
            { render: false },
        );
        // Save new diff object
        await this.spell.update({
            [`system.overlays.${variantId}`]: difference,
        });

        if (variantSpell.sheet.rendered) {
            variantSpell.sheet.render(true);
        }

        return variantSpell;
    }

    async deleteOverlay(overlayId: string): Promise<void> {
        this.verifyOverlayId(overlayId);

        await this.spell.update({
            [`system.overlays.-=${overlayId}`]: null,
        });
        this.delete(overlayId);
    }

    protected verifyOverlayId(overlayId: string): void {
        if (!this.has(overlayId)) {
            throw ErrorPF2e(
                `Spell ${this.spell.name} (${this.spell.uuid}) does not have an overlay with id: ${overlayId}`,
            );
        }
    }
}

export { SpellOverlayCollection };
