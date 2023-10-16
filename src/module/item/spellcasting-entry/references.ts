import * as R from "remeda";
import { ActorPF2e } from "@actor";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import { ItemProxyPF2e, SpellPF2e, SpellcastingEntryPF2e } from "@item";
import { SpellSystemSource } from "@item/spell/data.ts";
import { UUIDUtils } from "@util/uuid.ts";
import { SpellCollection } from "./collection.ts";
import { ErrorPF2e } from "@util";
import { BaseSpellcastingEntry } from "./index.ts";

class SpellReferences extends Collection<SpellReferenceSource> {
    actor: ActorPF2e;

    constructor(public entry: SpellcastingEntryPF2e<ActorPF2e>) {
        super(Object.entries(entry.system.references ?? {}));
        this.actor = entry.actor;
    }

    get collection(): SpellCollection<ActorPF2e, SpellcastingEntryPF2e<ActorPF2e>> | null {
        return this.entry.spells;
    }

    get spellCache(): Map<string, SpellPF2e<ActorPF2e>> {
        if (!(this.actor.sheet instanceof CreatureSheetPF2e)) {
            throw ErrorPF2e(`Invalid actor type "${this.actor.type}" for SpellReferences!`);
        }
        return this.actor.sheet.spellCache;
    }

    /** Cache all referenced spell documents in the compendium cache. This should run only once,
     *  before individual references are resolved */
    static async cacheAll<TActor extends ActorPF2e = ActorPF2e>(
        collection: Collection<SpellCollection<TActor, BaseSpellcastingEntry<TActor>>>,
    ): Promise<void> {
        if (!collection) return;

        const start = performance.now();
        const sourceIds = R.compact(
            collection.contents.flatMap((c) =>
                Object.values(c.entry.system?.references ?? {}).flatMap((r) => r.sourceId),
            ),
        );
        if (sourceIds.length === 0) return;

        const result = await UUIDUtils.fromUUIDs(sourceIds);
        const duration = performance.now() - start;
        console.log(
            `PF2e System | Retrieved ${result.length} Spell ${
                result.length === 1 ? "reference" : "references"
            } in ${duration}ms`,
        );
    }

    /** Converts an existing spell reference to an embedded spell */
    static async toItem(entry: Maybe<BaseSpellcastingEntry>, id: string): Promise<SpellPF2e | null> {
        if (!entry?.references) return null;
        if (!entry.references.has(id)) {
            throw ErrorPF2e(`No Reference with id "${id}" in SpellcastinEntry with id "${entry.id}"`);
        }
        const spell = entry.references.spellCache.get(id);
        if (!spell) return null;

        const convert = await Dialog.confirm({
            title: game.i18n.localize("PF2E.EditItemTitle"),
            content: `<p>${game.i18n.localize("PF2E.Item.References.EditDialogText")}</p>`,
            defaultYes: false,
        });
        if (convert) {
            await entry.references.deleteReference(spell.id, { render: false });
            const result = await spell.actor.createEmbeddedDocuments("Item", [spell.toObject()]);
            return (result[0] as SpellPF2e) ?? null;
        }
        return null;
    }

    /** Converts a spell to a spell reference */
    static async fromSpell<TActor extends ActorPF2e | null>(
        spell: SpellPF2e,
        entry: Maybe<BaseSpellcastingEntry>,
        { heightenTo, skipDialog }: ToReferenceOptions = {},
    ): Promise<SpellPF2e<TActor> | null> {
        if (spell.isReference || !entry?.references) return null;

        // Try to find a source UUID. World item references are not supported
        const sourceId = spell.uuid.startsWith("Compendium.")
            ? spell.uuid
            : spell.uuid.startsWith("Item.")
              ? null
              : spell.flags.core?.sourceId;

        // Ensure the UUID is not an embedded item inside of a compendium actor
        if (!sourceId || !/^Compendium\..*?\..*?\.Item\..*$/.test(sourceId)) return null;

        // Base reference data
        const reference: SpellReferenceSource = {
            sourceId,
            sort: spell.sort,
        };
        // Set heightened if required
        const heightenedRank = heightenTo ?? spell.system.location.heightenedLevel;
        if (heightenedRank) {
            reference.system = { location: { heightenedLevel: heightenedRank } };
        }
        // Set uses for innate spells
        if (entry.isInnate) {
            reference.system = mergeObject(
                reference.system ?? {},
                { location: { uses: { value: 1, max: 1 } } },
                { overwrite: false },
            );
        }
        // Handle embeddded spells
        if (spell.actor) {
            if (!skipDialog) {
                const confirmed = await Dialog.confirm({
                    title: game.i18n.localize("PF2E.Item.References.ToReferenceDialog.Title"),
                    content: `<p>${game.i18n.localize("PF2E.Item.References.ToReferenceDialog.Text")}</p>`,
                    defaultYes: false,
                });
                if (!confirmed) return null;
            }
            await spell.delete({ render: false });
            return entry.references.create(reference, spell.id);
        }
        return entry.references.create(reference);
    }

    /** Resolve spell references and add spells to actor collections */
    async resolve(): Promise<void> {
        if (!this.actor || this.size === 0) return;

        const cachedAndMisses = [...this.keys()].map((id) => this.spellCache.get(id) ?? id);
        const cached = cachedAndMisses.filter((i): i is SpellPF2e<ActorPF2e> => typeof i !== "string");
        if (cached.length === this.size) {
            return this.#setCollections(cached);
        }
        const misses = cachedAndMisses.filter((i): i is string => typeof i === "string");
        const uuids = R.compact(misses.map((id) => this.get(id)?.sourceId));

        // Retrieve cache misses, merge with reference data and add to spell cache
        const compendiumDocs = (await UUIDUtils.fromUUIDs(uuids)) as SpellPF2e<ActorPF2e>[];
        const fromCompendium: SpellPF2e<ActorPF2e>[] = [];
        for (const id of misses) {
            const data = deepClone(this.get(id) ?? null);
            const itemSource = compendiumDocs.find((i) => i.flags.core?.sourceId === data?.sourceId)?.toObject();
            if (!data || !itemSource) continue;
            delete (data as { sourceId: unknown }).sourceId;
            itemSource._id = id;
            itemSource.system.location.value = this.entry.id;
            const newItem = new ItemProxyPF2e(mergeObject(itemSource, data), {
                parent: this.actor,
            }) as SpellPF2e<ActorPF2e>;
            fromCompendium.push(newItem);
            this.spellCache.set(id, newItem);
        }
        this.#setCollections([...cached, ...fromCompendium]);
    }

    #setCollections(spells: SpellPF2e<ActorPF2e>[]): void {
        if (!this.actor || !this.collection) return;
        for (const spell of spells) {
            spell.isReference = true;
            if (!this.collection.get(spell.id)) {
                this.collection.set(spell.id, spell);
            }
            if (!this.actor.items.get(spell.id)) {
                this.actor.items.set(spell.id, spell);
            }
        }
        this.actor.resetItemTypesCache();
    }

    async create<TActor extends ActorPF2e | null>(
        reference: SpellReferenceSource,
        specificId?: string,
    ): Promise<SpellPF2e<TActor> | null> {
        const id = specificId ?? randomID();
        await this.entry.update({ [`system.references.${id}`]: reference });
        return (this.spellCache.get(id) as SpellPF2e<TActor>) ?? null;
    }

    async update(
        id: string,
        data: Record<string, unknown>,
        context?: DocumentUpdateContext<ActorPF2e>,
    ): Promise<SpellPF2e> {
        if (!this.#isValidUpdateData(data)) {
            throw ErrorPF2e(`Invalid spell reference update data: ${JSON.stringify(data)}`);
        }
        const spell = this.spellCache.get(id);
        if (!spell) {
            throw ErrorPF2e(`The Collection has no reference with id "${id}"!`);
        }
        // Update the cached spell
        spell.updateSource(data);
        // Update the reference data
        await this.entry.update({ [`system.references.${id}`]: data }, context);
        return spell;
    }

    override delete(id: string): boolean {
        const deleted = !!(
            super.delete(id) &&
            this.spellCache.delete(id) &&
            this.collection?.delete(id) &&
            this.actor?.items.delete(id)
        );
        if (deleted) {
            this.actor.resetItemTypesCache();
        }
        return deleted;
    }

    async deleteReference(id: string, context?: DocumentModificationContext<ActorPF2e>): Promise<void> {
        if (this.delete(id)) {
            await this.entry.update({ [`system.references.-=${id}`]: null }, context);
        }
    }

    async move(spellId: string, newEntryId: string): Promise<void> {
        const reference = this.get(spellId, { strict: true });
        const newEntry = this.actor.items.get<SpellcastingEntryPF2e<ActorPF2e>>(newEntryId, { strict: true });
        if (!this.delete(spellId)) {
            return;
        }

        // Handle moving from/to innate entries
        if (this.entry.isInnate && !newEntry.isInnate && reference.system?.location) {
            delete reference.system.location.uses;
            if (R.isEmpty(reference.system.location)) {
                delete reference.system;
            }
        } else if (newEntry.isInnate) {
            reference.system = mergeObject(
                reference.system ?? {},
                { location: { uses: { value: 1, max: 1 } } },
                { overwrite: false },
            );
        }

        const updates = [
            {
                _id: this.entry.id,
                [`system.references.-=${spellId}`]: null,
            },
            {
                _id: newEntry.id,
                [`system.references.${spellId}`]: reference,
            },
        ];
        await this.actor.updateEmbeddedDocuments("Item", updates);
    }

    #isValidUpdateData(data: Record<string, unknown>): boolean {
        const topLevelKeys = ["sort", "system"];
        const systemKeys = ["location"];
        const locationKeys = ["autoHeightenLevel", "heightenedLevel", "signature", "uses"];
        const expanded = expandObject(data);
        for (const key of Object.keys(expanded)) {
            if (!topLevelKeys.includes(key)) return false;
        }
        if (
            "system" in expanded &&
            R.isObject<{ system: { location?: Partial<SpellSystemSource["location"]> } }>(expanded)
        ) {
            for (const key of Object.keys(expanded.system)) {
                if (!systemKeys.includes(key)) return false;
            }
            if (expanded.system.location) {
                for (const key of Object.keys(expanded.system.location)) {
                    if (!locationKeys.includes(key)) return false;
                }
            }
        }
        return true;
    }
}

interface ToReferenceOptions {
    heightenTo?: number | null;
    skipDialog?: boolean;
}

interface SpellReferenceSource {
    sourceId: ItemUUID;
    sort: number;
    system?: {
        location: Partial<SpellSystemSource["location"]>;
    };
}

export { SpellReferences };
export type { SpellReferenceSource };
