import type { ActorPF2e } from "@actor";
import type UserTargets from "@client/canvas/placeables/tokens/targets.d.mts";
import type { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import type { TradeQueryData, TradeQueryResponse } from "@module/apps/trade-dialog/app.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import * as R from "remeda";
import type { UserFlagsPF2e, UserSettingsPF2e, UserSourcePF2e } from "./data.ts";

class UserPF2e extends User {
    override prepareData(): void {
        super.prepareData();
        if (canvas.ready && canvas.tokens.controlled.length > 0) {
            game.pf2e.effectPanel.refresh();
        }
    }

    /** Set user settings defaults */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.flags = fu.mergeObject(
            {
                pf2e: {
                    settings: {
                        showEffectPanel: true,
                        showCheckDialogs: true,
                        showDamageDialogs: true,
                        searchPackContents: false,
                        monochromeDarkvision: true,
                    },
                },
            },
            this.flags,
        );
    }

    get settings(): Readonly<UserSettingsPF2e> {
        return this.flags.pf2e.settings;
    }

    /** Get tokens controlled by this user or, failing that, a token of the assigned character. */
    getActiveTokens(): TokenDocumentPF2e[] {
        if (!canvas.ready || canvas.tokens.controlled.length === 0) {
            return [game.user.character?.getActiveTokens(true, true).shift()].filter(R.isTruthy);
        }
        return canvas.tokens.controlled.filter((t) => t.isOwner).map((t) => t.document);
    }

    /** Alternative to calling `updateTokenTargets` with no argument or an empty array */
    clearTargets(): void {
        this._onUpdateTokenTargets();
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        if (game.user.id !== userId) return;

        const keys = Object.keys(fu.flattenObject(changed));
        if (keys.includes("flags.pf2e.settings.showEffectPanel")) {
            game.pf2e.effectPanel.refresh();
        }
        if (keys.includes("flags.pf2e.settings.monochromeDarkvision") && canvas.ready) {
            canvas.scene?.reset();
            canvas.perception.update({ initializeVision: true, refreshLighting: true });
        }
    }
}

interface UserPF2e extends User {
    character: ActorPF2e<null> | null;
    targets: UserTargets<TokenPF2e<TokenDocumentPF2e<ScenePF2e>>>;
    flags: UserFlagsPF2e;
    readonly _source: UserSourcePF2e;

    query(name: "pf2e.trade", data: TradeQueryData, options?: { timeout?: number }): Promise<TradeQueryResponse>;
    query(name: string, data: object, options?: { timeout?: number }): Promise<unknown>;
}

export { UserPF2e };
