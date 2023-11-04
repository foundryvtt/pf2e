import type { ActorPF2e } from "@actor/base.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { UserFlagsPF2e, UserSourcePF2e } from "./data.ts";

class UserPF2e extends User<ActorPF2e<null>> {
    override prepareData(): void {
        super.prepareData();
        if (canvas.ready && canvas.tokens.controlled.length > 0) {
            game.pf2e.effectPanel.refresh();
        }
    }

    /** Set user settings defaults */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.flags = mergeObject(
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

    /** Alternative to calling `#updateTokenTargets()` with no argument or an empty array */
    clearTargets(): void {
        this.updateTokenTargets();
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<null>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        if (game.user.id !== userId) return;

        const keys = Object.keys(flattenObject(changed));
        if (keys.includes("flags.pf2e.settings.showEffectPanel")) {
            game.pf2e.effectPanel.refresh();
        }
        if (keys.includes("flags.pf2e.settings.monochromeDarkvision") && canvas.ready) {
            canvas.scene?.reset();
            canvas.perception.update({ initializeVision: true, refreshLighting: true }, true);
        }
    }
}

interface UserPF2e extends User<ActorPF2e<null>> {
    targets: Set<TokenPF2e<TokenDocumentPF2e<ScenePF2e>>>;
    flags: UserFlagsPF2e;
    readonly _source: UserSourcePF2e;
}

interface UserSettingsPF2e {
    showEffectPanel: boolean;
    showCheckDialogs: boolean;
    showDamageDialogs: boolean;
    monochromeDarkvision: boolean;
    searchPackContents: boolean;
}

export { UserPF2e, type UserSettingsPF2e };
