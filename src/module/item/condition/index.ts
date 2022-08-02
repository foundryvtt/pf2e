import { UserPF2e } from "@module/user";
import { sluggify } from "@util";
import { ItemPF2e } from "../base";
import { ConditionData, ConditionSlug } from "./data";

class ConditionPF2e extends ItemPF2e {
    /** Forthcoming universal "effect badge" */
    get badge(): { value: number } | null {
        return this.system.value.value ? { value: this.system.value.value } : null;
    }

    get value(): number | null {
        return this.system.value.value;
    }

    get duration(): number | null {
        return this.system.duration.perpetual ? null : this.system.duration.value;
    }

    /** Is the condition currently active? */
    get isActive(): boolean {
        return this.system.active;
    }

    /** Is the condition from the pf2e system or a module? */
    get fromSystem(): boolean {
        return !!this.flags.pf2e.condition;
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.system.sources.hud;
    }

    /** Ensure value.isValued and value.value are in sync */
    override prepareBaseData() {
        super.prepareBaseData();
        const systemData = this.system;
        systemData.value.value = systemData.value.isValued ? Number(systemData.value.value) || 1 : null;
    }

    /** Set a self roll option for this condition */
    override prepareActorData(this: Embedded<ConditionPF2e>): void {
        const slug = this.slug ?? sluggify(this.name);
        this.actor.rollOptions.all[`self:condition:${slug}`] = true;
        if (this.slug === "flat-footed") {
            this.actor.rollOptions.all["self:flatFooted"] = true;
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: ConditionModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        options.conditionValue = this.value;
        return super._preUpdate(changed, options, user);
    }

    protected override _onCreate(
        data: this["data"]["_source"],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        /* Suppress floaty text on "linked" conditions */
        if (this.system.references.parent?.type !== "condition") {
            this.actor?.getActiveTokens().shift()?.showFloatyText({ create: this });
        }
    }

    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: ConditionModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        const [priorValue, newValue] = [options.conditionValue, this.value];
        const valueChanged = !!priorValue && !!newValue && priorValue !== newValue;
        // Suppress floaty text on "linked" conditions
        if (valueChanged && this.system.references.parent?.type !== "condition") {
            const change = newValue > priorValue ? { create: this } : { delete: this };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }
    }

    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        super._onDelete(options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        /* Suppress floaty text on "linked" conditions */
        if (this.system.references.parent?.type !== "condition") {
            const baseName = this.system.base;
            const change = { delete: { name: baseName } };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }
    }
}

interface ConditionPF2e {
    readonly data: ConditionData;

    get slug(): ConditionSlug;
}

interface ConditionModificationContext<T extends ConditionPF2e> extends DocumentModificationContext<T> {
    conditionValue?: number | null;
}

export { ConditionPF2e, ConditionModificationContext };
