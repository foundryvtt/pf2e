import { ActorSourcePF2e } from "@actor/data/index.ts";
import { NPCSkillSource, NPCSpecialSkillSource } from "@actor/npc/data.ts";
import { SkillSlug } from "@actor/types.ts";
import { CORE_SKILL_SLUGS } from "@actor/values.ts";
import { LoreSource } from "@item/lore.ts";
import { FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { RollOptionRuleElement } from "@module/rules/rule-element/roll-option/rule-element.ts";
import { setHasElement, sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

export class Migration932NPCSystemSkills extends MigrationBase {
    static override version = 0.932;

    #MOD_STRING_RE = /^\+(\d+)\s(.*)/;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "npc") return;

        // Pull all lores that should be in actor system data. If none, exit
        const skillLores = source.items.filter(
            (i): i is LoreSource => i.type === "lore" && setHasElement(CORE_SKILL_SLUGS, sluggify(i.name)),
        );
        if (skillLores.length === 0) return;

        source.system.skills ??= {};
        for (const lore of skillLores) {
            const skillSlug = sluggify(lore.name) as SkillSlug;
            if (typeof source.system.skills[skillSlug]?.base === "number") continue;

            // Add skill, then check for variants
            const base = lore.system.mod.value;
            const skill: NPCSkillSource = { base };
            source.system.skills[skillSlug] = skill;

            // Find any roll option toggles, for each see if there isn't an item that fits better
            // We transfer them to a better place then remove this item
            const rollOptions = lore.system.rules
                .filter((r): r is RollOptionRuleElement => r.key === "RollOption")
                .filter((r) => r.toggleable === true);
            for (const option of rollOptions) {
                for (const item of source.items.filter((i) => i.type === "action")) {
                    if (option.option === (item.system.slug ?? sluggify(item.name))) {
                        item.system.rules.push(option);
                    }
                }
            }

            // Pull flat modifiers, and coerce stringy numbers to numbers.
            // These are getting deleted, so side effects are ok
            const flatModifiers = lore.system.rules
                .filter((r): r is FlatModifierSource => r.key === "FlatModifier")
                .filter((r): r is FlatModifierSource & { value: number } => {
                    if (typeof r.value === "string" && r.value.trim() === "") return false;
                    const value = Number(r.value);
                    if (!Number.isNaN(value)) {
                        r.value = value;
                        return true;
                    }
                    return false;
                });

            const specialModifiers: NPCSpecialSkillSource[] = [];
            for (const v of Object.values(lore.system.variants ?? {})) {
                // Check to see if this is a "restriction" or "note" variant like "only crafting"
                // These are identified by not having a number at all
                if (!/\d/.exec(v.label)) {
                    skill.note = v.label;
                    continue;
                }

                const match = this.#MOD_STRING_RE.exec(v.label);
                const [modFromString, label] = match ? [Number(match[1]), match[2]] : [null, v.label];

                // Fetch the flat modifier associated with this variant to get accurate predicates and values
                // This is also a backup in order to migrate actors in foreign languages
                const possibleModifiers = flatModifiers.filter((m) =>
                    Array.isArray(m.selector) ? m.selector.includes(skillSlug) : m.selector === skillSlug,
                );
                const modifier = modFromString
                    ? possibleModifiers.find((m) => m.value === modFromString - base)
                    : possibleModifiers.at(0);

                const variant: NPCSpecialSkillSource = {
                    label,
                    base: modFromString ?? (modifier ? base + modifier.value : 0),
                };
                if (Array.isArray(modifier?.predicate) && modifier.predicate.length > 0) {
                    variant.predicate = modifier.predicate;
                }
                specialModifiers.push(variant);
            }

            if (specialModifiers.length) {
                skill.special = specialModifiers;
            }
        }

        // Remove lore items
        const itemsToRemove = new Set(skillLores.map((s) => s._id));
        source.items = source.items.filter((i) => !itemsToRemove.has(i._id));
    }
}
