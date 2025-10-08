import { ActorPF2e } from "@actor";
import type { RawItemChatData } from "@item/base/data/index.ts";
import type { ConsumableTrait } from "@item/consumable/types.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import type { WeaponPF2e } from "@item/weapon/document.ts";
import { PickAThingPrompt } from "@module/apps/pick-a-thing-prompt/app.ts";
import type { ValueAndMax } from "@module/data.ts";
import type { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { objectHasKey, tupleHasValue } from "@util";
import * as R from "remeda";
import { AmmoSource, AmmoSystemData } from "./data.ts";
import type { AmmoType } from "./types.ts";

class AmmoPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<ConsumableTrait, string> {
        return CONFIG.PF2E.consumableTraits;
    }

    get uses(): ValueAndMax {
        return R.pick(this.system.uses, ["value", "max"]);
    }

    override prepareBaseData(): void {
        // Determine stack group from ammo type. This must happen first for bulk calculation to work
        const ammoTypeData = this.system.baseItem ? CONFIG.PF2E.ammoTypes[this.system.baseItem] : null;
        this.system.stackGroup = ammoTypeData?.stackGroup ?? null;

        super.prepareBaseData();
        this.system.uses.max ||= 1;

        // Refuse to serve rule elements if this item is ammunition and has types that perform writes
        for (const rule of this.system.rules) {
            if (rule.key === "RollOption" && "toggleable" in rule && !!rule.toggleable) {
                console.warn("Toggleable RollOption rule elements may not be added to ammunition");
                this.system.rules = [];
                break;
            } else if (["GrantItem", "ChoiceSet"].includes(String(rule.key))) {
                console.warn(`${rule.key} rule elements may not be added to ammunition`);
                this.system.rules = [];
                break;
            }
        }
    }

    isAmmoFor(weapon: WeaponPF2e): boolean {
        if (!weapon.isOfType("weapon")) {
            console.warn("Cannot load a consumable into a non-weapon");
            return false;
        }

        // Return true if this is an exact match
        const weaponData = weapon.system.ammo;

        // If this is not ammo or the weapon doesn't take ammo, return
        if (!this.system.baseItem || !weaponData || weaponData.builtIn) {
            return false;
        }

        const thisAmmoTypeData = this.system.baseItem ? CONFIG.PF2E.ammoTypes[this.system.baseItem] : null;
        const weaponAmmoTypeData = objectHasKey(CONFIG.PF2E.ammoTypes, weaponData.baseType)
            ? CONFIG.PF2E.ammoTypes[weaponData.baseType]
            : null;
        const basicAmmoType = thisAmmoTypeData?.parent ?? this.system.baseItem;
        const basicWeaponAmmoType = weaponAmmoTypeData?.parent ?? weaponData.baseType;
        const isMagazine = thisAmmoTypeData?.magazine || this.system.uses.max > 1;

        return (
            // Return true if it is an exact match
            this.system.baseItem === weaponData.baseType ||
            // Return true if this is a non-magazine and the weapon accepts anything
            (!isMagazine && weaponData.baseType === null) ||
            // Return true if one is a general variant of the other
            (basicAmmoType === basicWeaponAmmoType && (!thisAmmoTypeData?.weapon || !weaponAmmoTypeData?.weapon))
        );
    }

    /** Use a consumable item, sending the result to chat */
    async consume(thisMany = 1): Promise<void> {
        const actor = this.actor;
        if (!actor) return;
        const uses = this.uses;

        // Announce consumption of special ammunition. Do something better later
        if (this.system.craftableAs) {
            const exhausted = uses.max >= thisMany && uses.value === thisMany;
            const key = exhausted && uses.max > 1 ? "UseExhausted" : uses.max > thisMany ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: uses.value - thisMany,
            });
            const flags = {
                pf2e: {
                    origin: {
                        sourceId: this.sourceId,
                        uuid: this.uuid,
                        type: this.type,
                    },
                },
            };
            const speaker = ChatMessage.getSpeaker({ actor });
            ChatMessage.create({ speaker, content, flags });
        }

        // Optionally destroy the item or deduct charges or quantity
        // Also keep if it has rule elements
        if (this.system.uses.autoDestroy && uses.value <= thisMany) {
            const newQuantity = Math.max(this.quantity - (uses.max > 1 ? 1 : thisMany), 0);
            const isPreservedAmmo = this.system.rules.length > 0;
            if (newQuantity <= 0 && !isPreservedAmmo) {
                await this.delete();
            } else {
                await this.update({
                    "system.quantity": newQuantity,
                    "system.uses.value": uses.max,
                });
            }
        } else {
            await this.update({
                "system.uses.value": Math.max(uses.value - thisMany, 0),
            });
        }
    }

    override async getChatData(htmlOptions: EnrichmentOptionsPF2e = {}): Promise<RawItemChatData> {
        const traits = this.traitChatData(AmmoPF2e.validTraits);
        return this.processChatData(htmlOptions, { ...(await super.getChatData()), traits });
    }

    protected override async _preCreate(
        data: DeepPartial<this["_source"]>,
        options: foundry.abstract.DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        // Check if this is special ammo being added to an actor, if so, show a prompt
        const system = this._source.system;
        const craftableAs = system.craftableAs;
        if (this.parent && craftableAs && !system.baseItem) {
            const allAmmoTypes = R.entries(CONFIG.PF2E.ammoTypes)
                .filter(([_, data]) => !data.magazine)
                .map(([slug, data]) => ({
                    slug,
                    ...data,
                    option: { value: slug, label: game.i18n.localize(data.label) },
                }));
            const compatibleTypes = craftableAs.length
                ? allAmmoTypes.filter((t) => craftableAs.includes(t.slug) || tupleHasValue(craftableAs, t.parent))
                : allAmmoTypes;
            const supported: string[] = R.unique(
                this.parent.itemTypes.weapon.map((w) => w.system.ammo?.baseType).filter((t) => !!t),
            );

            const result = await new PickAThingPrompt<AmmoType>({
                title: this.name,
                prompt: game.i18n.localize("PF2E.Item.Ammo.SpecialAmmoPicker.Prompt"),
                item: this,
                choices: R.sortBy(compatibleTypes, (t) => (supported.includes(t.slug) ? 0 : t.weapon ? 2 : 1)).map(
                    (t) => ({
                        value: t.slug,
                        label: game.i18n.localize(t.label),
                        group: game.i18n.localize(
                            `PF2E.Item.Ammo.Groups.${supported.includes(t.slug) ? "OwnWeapons" : t.weapon ? "WeaponSpecific" : "General"}`,
                        ),
                    }),
                ),
            }).resolveSelection();
            system.baseItem = result?.value ?? null;

            // If this item can stack, add to the existing quantity and reject creation
            const stackableItem = this.actor?.inventory.findStackableItem(this._source);
            if (stackableItem) {
                stackableItem.update({ "system.quantity": stackableItem.quantity + 1 });
                return false;
            }
        }
        return super._preCreate(data, options, user);
    }

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: foundry.abstract.DatabaseUpdateCallbackOptions & { checkHP?: boolean },
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, operation, user);

        // Lock uses to once only if it is non-magazine ammo
        const craftableAs =
            "craftableAs" in changed.system ? changed.system.craftableAs : this._source.system.craftableAs;
        const baseItem = "baseItem" in changed.system ? changed.system.baseItem : this._source.system.baseItem;
        const data = baseItem ? CONFIG.PF2E.ammoTypes[baseItem] : null;
        if (!data?.magazine || craftableAs?.length) {
            changed.system.uses = { value: 1, max: 1 };
        }

        if (changed.system.uses) {
            if ("value" in changed.system.uses) {
                const minimum = this.system.uses.autoDestroy ? 1 : 0;
                changed.system.uses.value = Math.clamp(
                    Math.floor(Number(changed.system.uses.value)) || minimum,
                    minimum,
                    9999,
                );
            }

            if ("max" in changed.system.uses) {
                changed.system.uses.max = Math.clamp(Math.floor(Number(changed.system.uses.max)) || 1, 1, 9999);
            }

            if (typeof changed.system.uses.value === "number" && typeof changed.system.uses.max === "number") {
                changed.system.uses.value = Math.min(changed.system.uses.value, changed.system.uses.max);
            }
        }

        if (changed.system.price?.per !== undefined) {
            changed.system.price.per = Math.clamp(Math.floor(Number(changed.system.price.per)) || 1, 1, 999);
        }

        return super._preUpdate(changed, operation, user);
    }
}

interface AmmoPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: AmmoSource;
    system: AmmoSystemData;
}

export { AmmoPF2e };
