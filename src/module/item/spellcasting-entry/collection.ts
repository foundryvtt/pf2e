import { SpellPF2e, SpellSource } from "@item";
import { OneToTen, ZeroToTen } from "@module/data";
import { ErrorPF2e, groupBy, ordinal } from "@util";
import { SpellcastingEntryPF2e } from ".";
import { ActiveSpell, SlotKey, SpellcastingSlotLevel, SpellPrepEntry, SpellReferenceData } from "./data";

export class SpellCollection extends Collection<Embedded<SpellPF2e>> {
    constructor(public entry: Embedded<SpellcastingEntryPF2e>) {
        super();
    }

    get id() {
        return this.entry.id;
    }

    get actor() {
        return this.entry.actor;
    }

    get highestLevel(): number {
        const highestSpell = Math.max(...this.map((s) => s.level));
        const actorSpellLevel = Math.ceil((this.actor?.level ?? 0) / 2);
        return Math.min(10, Math.max(highestSpell, actorSpellLevel));
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not. If given a level, it will heighten to that level if it can be.
     */
    async addSpell(spell: SpellPF2e, options: { slotLevel?: number } = {}): Promise<SpellPF2e | null> {
        const actor = this.actor;
        if (!actor.isOfType("creature")) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        const isStandardSpell = !(spell.isCantrip || spell.isFocusSpell || spell.isRitual);
        const canHeighten = isStandardSpell && (this.entry.isSpontaneous || this.entry.isInnate);

        // Only allow a different slot level if the spell can heighten
        const heightenLevel = canHeighten ? options.slotLevel ?? spell.level : spell.baseLevel;

        const spellcastingEntryId = spell.system.location.value;
        if (spellcastingEntryId === this.id && spell.level === heightenLevel) {
            return null;
        }

        // Don't allow focus spells in non-focus casting entries
        if (spell.isFocusSpell && !this.entry.isFocusPool) {
            const focusTypeLabel = game.i18n.format("PF2E.SpellFocusLabel");
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.WrongSpellType", {
                    spellType: focusTypeLabel,
                })
            );
            return null;
        }

        // Warn if the level being dragged to is lower than spell's level
        if (spell.baseLevel > heightenLevel && this.id === spell.system.location?.value) {
            const targetLevelLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(heightenLevel) });
            const baseLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(spell.baseLevel) });
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.InvalidLevel", {
                    name: spell.name,
                    targetLevel: targetLevelLabel,
                    baseLevel: baseLabel,
                })
            );
        }

        const heightenedUpdate =
            canHeighten && heightenLevel >= spell.baseLevel ? { "system.location.heightenedLevel": heightenLevel } : {};

        if (spell.actor === actor) {
            return spell.update({ "system.location.value": this.id, ...heightenedUpdate });
        } else {
            const source = spell.clone({ "system.location.value": this.id, ...heightenedUpdate }).toObject();
            const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

            return created instanceof SpellPF2e ? created : null;
        }
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, slotLevel: number, spellSlot: number): Promise<SpellcastingEntryPF2e> {
        if (spell.baseLevel > slotLevel && !(slotLevel === 0 && spell.isCantrip)) {
            const targetLevelLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(slotLevel) });
            const baseLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(spell.baseLevel) });
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.InvalidLevel", {
                    name: spell.name,
                    targetLevel: targetLevelLabel,
                    baseLevel: baseLabel,
                })
            );

            return this.entry;
        }

        if (CONFIG.debug.hooks) {
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${this.id}`
            );
        }

        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}`;
        const updates: Record<string, unknown> = { [key]: { id: spell.id } };

        const slot = this.entry.system.slots[`slot${slotLevel}` as SlotKey].prepared[spellSlot];
        if (slot) {
            if (slot.prepared !== undefined) {
                updates[`${key}.-=prepared`] = null;
            }
            if (slot.name !== undefined) {
                updates[`${key}.-=name`] = null;
            }
        }

        return this.entry.update(updates);
    }

    /** Removes the spell slot and updates the spellcasting entry */
    unprepareSpell(slotLevel: number, spellSlot: number): Promise<SpellcastingEntryPF2e> {
        if (CONFIG.debug.hooks === true) {
            console.debug(
                `PF2e System | Updating spellcasting entry ${this.id} to remove spellslot ${spellSlot} for spell level ${slotLevel}`
            );
        }

        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}`;
        return this.entry.update({
            [key]: {
                name: game.i18n.localize("PF2E.SpellSlotEmpty"),
                id: null,
                prepared: false,
                expended: false,
            },
        });
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    setSlotExpendedState(slotLevel: number, spellSlot: number, isExpended: boolean): Promise<SpellcastingEntryPF2e> {
        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}.expended`;
        return this.entry.update({ [key]: isExpended });
    }

    /** Resolves spell references and adds derived items to this Collection and the owning Actor.
     *  Does nothing if all references are already resolved.
    async resolveReferences(): Promise<void> {
        if (!this.actor) return;

        const start = performance.now();
        let counter = 0;
        for (const reference of Object.values(this.entry.spellReferences)) {
            if (!reference.sourceId || this.has(reference._id)) continue;

            const refSpellSource = (await fromUuid<SpellPF2e>(reference.sourceId!))?.toObject();
            if (!refSpellSource) {
                console.warn(
                    `Could not resolve UUID [${reference.sourceId}] in SpellcastingEntry [${this.entry.uuid}]!`
                );
                continue;
            }
            const refSource = deepClone(reference);
            delete refSource.sourceId;

            const newSource = mergeObject(refSpellSource, refSource);
            newSource.system.location.value = this.entry.id;
            const spell = new SpellPF2e(newSource, { parent: this.actor }) as Embedded<SpellPF2e>;
            spell.isReference = true;

            this.actor.items.set(spell.id, spell);
            this.actor.itemTypes.spell.push(spell);
            this.set(spell.id, spell);
            counter += 1;
        }
        const end = performance.now();
        console.log(`Execution time (${this.actor.name}) [${this.entry.uuid}] (${counter}): ${end - start} ms`);
    } */

    /** Resolves spell references and adds derived items to this Collection and the owning Actor.
     *  Does nothing if all references are already resolved.
     */
    async resolveReferences() {
        if (!this.actor) return;
        const start = performance.now();
        const compendiumMap: Map<string, Map<string, SpellReferenceData>> = new Map();
        for (const reference of Object.values(this.entry.spellReferences)) {
            if (!reference.sourceId || this.has(reference._id)) continue;
            const [type, scope, packId, id]: (string | undefined)[] = reference.sourceId.split(".");
            if (type !== "Compendium") continue;

            const pack = `${scope}.${packId}`;
            const refSource = deepClone(reference);
            delete refSource.sourceId;

            if (compendiumMap.has(pack)) {
                compendiumMap.get(pack)!.set(id, refSource);
            } else {
                const idMap: Map<string, SpellReferenceData> = new Map();
                idMap.set(id, refSource);
                compendiumMap.set(pack, idMap);
            }
        }
        let counter = 0;
        for (const [packId, idMap] of compendiumMap.entries()) {
            const pack = game.packs.get(packId);
            if (!pack) {
                console.warn("Pack doesn't exist");
                continue;
            }
            const ids = [...idMap.keys()];
            const docs = (await pack.getDocuments({ _id: { $in: ids } })) as SpellPF2e[];
            counter = docs.length;
            for (const doc of docs) {
                const refSpellSource = doc.toObject();
                const refSource = idMap.get(doc.id)!;

                const newSource = mergeObject(refSpellSource, refSource);
                newSource.system.location.value = this.entry.id;
                const spell = new SpellPF2e(newSource, { parent: this.actor }) as Embedded<SpellPF2e>;
                spell.isReference = true;

                this.actor.items.set(spell.id, spell);
                this.actor.itemTypes.spell.push(spell);
                this.set(spell.id, spell);
            }
        }
        const end = performance.now();
        console.log(`Execution time (${this.actor.name}) [${this.entry.uuid}] (${counter} Items): ${end - start} ms`);
    }

    /** Create a new spell reference from a spell in this Collection */
    async createReference(id: string): Promise<void> {
        const spell = this.get(id, { strict: true });
        const sourceId = spell.flags.core?.sourceId;
        if (!sourceId) {
            throw ErrorPF2e(`Spell [${spell.uuid}] in SpellcastingEntry [${this.entry.uuid}] has no source flag!`);
        }
        if (this.entry.spellReferences[id]) {
            throw ErrorPF2e(
                `A spell reference with id [${id}] already exists in SpellcastingEntry [${this.entry.uuid}]!`
            );
        }
        const compendiumSource = (await fromUuid<SpellPF2e>(sourceId))?.toObject();
        if (!compendiumSource) {
            throw ErrorPF2e(`Could not resolve UUID [${sourceId}] in SpellcastingEntry [${this.entry.uuid}]!`);
        }
        const spellSource = spell.toObject() as DeepPartial<SpellSource> & { _stats: unknown };
        // Clean up spell source
        delete spellSource._stats;
        delete spellSource.ownership;
        delete spellSource.system?.damage;
        delete spellSource.system?.schema;
        delete spellSource.system?.location?.value;

        const diff = diffObject<SpellReferenceData>(compendiumSource, spellSource);
        diff.sourceId = sourceId;

        await spell.delete({ render: false });
        await this.entry.update({ [`system.spellReferences.${id}`]: diff });
    }

    async convertReference(id: string): Promise<void> {
        const reference = this.entry.spellReferences[id];
        if (!reference) {
            throw ErrorPF2e(`SpellcastingEntry [${this.entry.uuid}] has no reference with id ${id}!`);
        }
        if (!reference.sourceId) {
            throw ErrorPF2e(`Reference [${id}] in SpellcastingEntry [${this.entry.uuid}] has no sourceId!`);
        }
        const spellSource = this.get(id, { strict: true })?.toObject();
        await this.deleteReference(id, { render: false });
        await this.actor.createEmbeddedDocuments("Item", [spellSource]);
    }

    /** Update spell reference data */
    async updateReference(
        id: string,
        data: DocumentUpdateData<SpellPF2e>,
        options?: DocumentModificationContext<Embedded<SpellcastingEntryPF2e>>
    ): Promise<SpellPF2e> {
        const reference = this.entry.spellReferences[id];
        if (!reference) {
            throw ErrorPF2e(`SpellcastingEntry [${this.entry.uuid}] has no reference with id ${id}!`);
        }

        const spell = this.get(id, { strict: true });
        spell.updateSource(data, options);
        await this.entry.update({ [`system.spellReferences.${id}`]: data }, options);

        return spell;
    }

    /** Delete a spell reference from this Collection and the owning Actor */
    async deleteReference(id: string, options: { render?: boolean } = {}): Promise<SpellPF2e> {
        const reference = this.entry.spellReferences[id];
        if (!reference) {
            throw ErrorPF2e(`SpellcastingEntry [${this.entry.uuid}] has no reference with id ${id}!`);
        }
        const spell = this.get(id, { strict: true });
        this.delete(id);
        this.actor.items.delete(id);
        this.actor.itemTypes.spell.findSplice((s) => s.id === id);

        await this.entry.update({ [`system.spellReferences.-=${id}`]: null }, { ...options });

        return spell;
    }

    async getSpellData() {
        const { actor } = this.entry;
        if (!actor.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        const results: SpellcastingSlotLevel[] = [];
        const spells = this.contents.sort((s1, s2) => (s1.sort || 0) - (s2.sort || 0));
        const signatureSpells = spells.filter((s) => s.system.location.signature);

        const isFlexible = this.entry.isFlexible;

        if (this.entry.isPrepared) {
            // Prepared Spells. Active spells are what's been prepped.
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.entry.system.slots[`slot${level}` as SlotKey];

                // Detect which spells are active. If flexible, it will be set later via signature spells
                const active: (ActiveSpell | null)[] = [];
                const showLevel = this.entry.system.showSlotlessLevels.value || data.max > 0;
                if (showLevel && (level === 0 || !isFlexible)) {
                    const maxPrepared = Math.max(data.max, 0);
                    active.push(...Array(maxPrepared).fill(null));
                    for (const [key, value] of Object.entries(data.prepared)) {
                        const spell = value.id ? this.get(value.id) : null;
                        if (spell) {
                            active[Number(key)] = {
                                spell,
                                chatData: await spell.getChatData({}, { slotLevel: level }),
                                expended: !!value.expended,
                            };
                        }
                    }
                }

                results.push({
                    label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                    level: level as ZeroToTen,
                    uses: {
                        value: level > 0 && isFlexible ? data.value || 0 : undefined,
                        max: data.max,
                    },
                    isCantrip: level === 0,
                    active,
                });
            }
        } else if (this.entry.isFocusPool) {
            // Focus Spells. All non-cantrips are grouped together as they're auto-scaled
            const cantrips = spells.filter((spell) => spell.isCantrip);
            const leveled = spells.filter((spell) => !spell.isCantrip);

            if (cantrips.length) {
                const active = await Promise.all(
                    cantrips.map(async (spell) => ({ spell, chatData: await spell.getChatData() }))
                );
                results.push({
                    label: "PF2E.Actor.Creature.Spellcasting.Cantrips",
                    level: 0,
                    isCantrip: true,
                    active,
                });
            }

            if (leveled.length) {
                const active = await Promise.all(
                    leveled.map(async (spell) => ({ spell, chatData: await spell.getChatData() }))
                );
                results.push({
                    label: actor.isOfType("character") ? "PF2E.Focus.Spells" : "PF2E.Focus.Pool",
                    level: Math.max(1, Math.ceil(actor.level / 2)) as OneToTen,
                    isCantrip: false,
                    uses: actor.system.resources.focus ?? { value: 0, max: 0 },
                    active,
                });
            }
        } else {
            // Everything else (Innate/Spontaneous/Ritual)
            const alwaysShowHeader = !this.entry.isRitual;
            const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.level));
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.entry.system.slots[`slot${level}` as SlotKey];
                const spells = spellsByLevel.get(level) ?? [];
                if (alwaysShowHeader || spells.length) {
                    const uses =
                        this.entry.isSpontaneous && level !== 0 ? { value: data.value, max: data.max } : undefined;
                    const active = await Promise.all(
                        spells.map(async (spell) => ({
                            spell,
                            chatData: await spell.getChatData(),
                            expended: this.entry.isInnate && !spell.system.location.uses?.value,
                            uses: this.entry.isInnate && !spell.unlimited ? spell.system.location.uses : undefined,
                        }))
                    );

                    // These entries hide if there are no active spells at that level, or if there are no spell slots
                    const hideForSpontaneous = this.entry.isSpontaneous && uses?.max === 0 && active.length === 0;
                    const hideForInnate = this.entry.isInnate && active.length === 0;
                    if (!this.entry.system.showSlotlessLevels.value && (hideForSpontaneous || hideForInnate)) continue;

                    results.push({
                        label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                        level: level as ZeroToTen,
                        isCantrip: level === 0,
                        uses,
                        active,
                    });
                }
            }
        }

        // Handle signature spells, we need to add signature spells to each spell level
        if (this.entry.isSpontaneous || isFlexible) {
            for (const spell of signatureSpells) {
                for (const result of results) {
                    if (spell.baseLevel > result.level) continue;
                    if (!this.entry.system.showSlotlessLevels.value && result.uses?.max === 0) continue;

                    const existing = result.active.find((a) => a?.spell.id === spell.id);
                    if (existing) {
                        existing.signature = true;
                    } else {
                        const chatData = await spell.getChatData({}, { slotLevel: result.level });
                        result.active.push({ spell, chatData, signature: true, virtual: true });
                    }
                }
            }
        }

        // If flexible, the limit is the number of slots, we need to notify the user
        const flexibleAvailable = (() => {
            if (!isFlexible) return undefined;
            const totalSlots = results
                .filter((result) => !result.isCantrip)
                .map((level) => level.uses?.max || 0)
                .reduce((first, second) => first + second, 0);
            return { value: signatureSpells.length, max: totalSlots };
        })();

        return {
            levels: results,
            flexibleAvailable,
            spellPrepList: this.getSpellPrepList(spells),
        };
    }

    private getSpellPrepList(spells: Embedded<SpellPF2e>[]) {
        if (!this.entry.isPrepared) return {};

        const spellPrepList: Record<number, SpellPrepEntry[]> = {};
        const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.baseLevel));
        for (let level = 0; level <= this.highestLevel; level++) {
            // Build the prep list
            spellPrepList[level] =
                spellsByLevel.get(level as ZeroToTen)?.map((spell) => ({
                    spell,
                    signature: this.entry.isFlexible && spell.system.location.signature,
                })) ?? [];
        }

        return Object.values(spellPrepList).some((s) => !!s.length) ? spellPrepList : null;
    }
}
