import { UserPF2e } from "@module/user";
import { sluggify } from "@util";
import { ItemPF2e } from "../base";
import { ConditionData, ConditionType } from "./data";

export class ConditionPF2e extends ItemPF2e {
    static override get schema(): typeof ConditionData {
        return ConditionData;
    }

    /** Forthcoming universal "effect badge" */
    get badge(): { value: number } | null {
        return this.data.data.value.value ? { value: this.data.data.value.value } : null;
    }

    get value(): number | null {
        return this.data.data.value.value;
    }

    get duration(): number | null {
        return this.data.data.duration.perpetual ? null : this.data.data.duration.value;
    }

    /** Is the condition currently active? */
    get isActive(): boolean {
        return this.data.data.active;
    }

    /** Is the condition from the pf2e system or a module? */
    get fromSystem(): boolean {
        return !!this.getFlag("pf2e", "condition");
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.data.data.sources.hud;
    }

    /** Ensure value.isValued and value.value are in sync */
    override prepareBaseData() {
        super.prepareBaseData();
        const systemData = this.data.data;
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

        /* Suppress floaty text on "linked" conditions */
        if (this.data.data.references.parent?.type !== "condition") {
            this.actor?.showFloatyStatus(true, this.name, this.value);
        }
    }

    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: ConditionModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        /* Suppress floaty text on "linked" conditions */
        if (this.data.data.references.parent?.type !== "condition") {
            const valueChange = (this.value ?? 0) - (options.conditionValue ?? 0);
            if (valueChange) {
                this.actor?.showFloatyStatus(valueChange >= 0, this.name, this.value);
            }
        }
    }

    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        super._onDelete(options, userId);

        /* Suppress floaty text on "linked" conditions */
        if (this.data.data.references.parent?.type !== "condition") {
            this.actor?.showFloatyStatus(false, this.name, null);
        }
    }
}

export interface ConditionPF2e {
    readonly data: ConditionData;

    get slug(): ConditionType;

    getFlag(scope: "core", key: "sourceId"): string | undefined;
    getFlag(scope: "pf2e", key: "constructing"): true | undefined;
    getFlag(scope: "pf2e", key: "condition"): true | undefined;
    getFlag(scope: string, key: string): any;
}

export interface ConditionModificationContext<T extends ConditionPF2e> extends DocumentModificationContext<T> {
    conditionValue?: number | null;
}
