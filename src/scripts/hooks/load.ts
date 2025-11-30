import { ActorPF2e, ActorProxyPF2e } from "@actor";
import { ArmySystemData } from "@actor/army/data.ts";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { FamiliarSystemData } from "@actor/familiar/data.ts";
import { HazardSystemData } from "@actor/hazard/data.ts";
import { resetActors } from "@actor/helpers.ts";
import { LootSystemData } from "@actor/loot/data.ts";
import { PartySystemData } from "@actor/party/data.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { VehicleSystemData } from "@actor/vehicle/data.ts";
import { ItemProxyPF2e } from "@item";
import { AbilitySystemData } from "@item/ability/index.ts";
import { AfflictionSystemData } from "@item/affliction/data.ts";
import { CampaignFeatureSystemData } from "@item/campaign-feature/data.ts";
import { ClassSystemData } from "@item/class/data.ts";
import { ConditionSystemData } from "@item/condition/data.ts";
import { EffectSystemData } from "@item/effect/data.ts";
import { FeatSystemData } from "@item/feat/data.ts";
import { HeritageSystemData } from "@item/heritage/data.ts";
import { KitSystemData } from "@item/kit/data.ts";
import { MeleeSystemData } from "@item/melee/data.ts";
import { TreasureSystemData } from "@item/treasure/data.ts";
import { ActiveEffectPF2e } from "@module/active-effect.ts";
import { TradeDialog } from "@module/apps/trade-dialog/app.ts";
import { DoorControlPF2e } from "@module/canvas/door-control.ts";
import { EnvironmentCanvasGroupPF2e } from "@module/canvas/group/environment.ts";
import {
    AmbientLightPF2e,
    EffectsCanvasGroupPF2e,
    LightingLayerPF2e,
    MeasuredTemplatePF2e,
    RegionPF2e,
    RulerPF2e,
    TemplateLayerPF2e,
    TokenPF2e,
} from "@module/canvas/index.ts";
import { TokenLayerPF2e } from "@module/canvas/layer/token.ts";
import { TerrainDataPF2e } from "@module/canvas/token/movement/terrain-data.ts";
import { TokenRulerPF2e } from "@module/canvas/token/ruler.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActorsPF2e } from "@module/collection/actors.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { MacroPF2e } from "@module/macro.ts";
import { UserPF2e } from "@module/user/index.ts";
import {
    AmbientLightDocumentPF2e,
    EnvironmentBehaviorType,
    EnvironmentFeatureBehaviorType,
    MeasuredTemplateDocumentPF2e,
    RegionBehaviorPF2e,
    RegionDocumentPF2e,
    ScenePF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e,
} from "@scene/index.ts";
import { DifficultTerrainBehaviorType } from "@scene/region-behavior/difficult-terrain.ts";
import { PrototypeTokenConfigPF2e } from "@scene/token-document/index.ts";
import { monkeyPatchFoundry } from "@scripts/🐵🩹.ts";
import { CheckRoll, StrikeAttackRoll } from "@system/check/roll.ts";
import { ClientDatabaseBackendPF2e } from "@system/client-backend.ts";
import { DamageInstance, DamageRoll } from "@system/damage/roll.ts";
import { ArithmeticExpression, Grouping, InstancePool, IntermediateDie } from "@system/damage/terms.ts";
import { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import * as R from "remeda";

/** Not an actual hook listener but rather things to run on initial load */
export class Load {
    static listen(): void {
        // Assign database backend to handle migrations
        CONFIG.DatabaseBackend = new ClientDatabaseBackendPF2e();

        // Assign document classes
        CONFIG.ActiveEffect.documentClass = ActiveEffectPF2e;
        CONFIG.Actor.collection = ActorsPF2e;
        CONFIG.Actor.defaultType = "character";
        CONFIG.Actor.documentClass = ActorProxyPF2e;
        CONFIG.AmbientLight.documentClass = AmbientLightDocumentPF2e;
        CONFIG.AmbientLight.objectClass = AmbientLightPF2e;
        CONFIG.ChatMessage.documentClass = ChatMessagePF2e;
        CONFIG.Combat.documentClass = EncounterPF2e;
        CONFIG.Combatant.documentClass = CombatantPF2e;
        CONFIG.Item.defaultType = "action";
        CONFIG.Item.documentClass = ItemProxyPF2e;
        CONFIG.Macro.documentClass = MacroPF2e;
        CONFIG.MeasuredTemplate.defaults.angle = 90;
        CONFIG.MeasuredTemplate.defaults.width = 1;
        CONFIG.MeasuredTemplate.documentClass = MeasuredTemplateDocumentPF2e;
        CONFIG.MeasuredTemplate.objectClass = MeasuredTemplatePF2e;

        CONFIG.Region.documentClass = RegionDocumentPF2e;
        CONFIG.Region.objectClass = RegionPF2e;
        CONFIG.RegionBehavior.dataModels.environment = EnvironmentBehaviorType;
        CONFIG.RegionBehavior.dataModels.environmentFeature = EnvironmentFeatureBehaviorType;
        CONFIG.RegionBehavior.dataModels.modifyMovementCost = DifficultTerrainBehaviorType;
        CONFIG.RegionBehavior.documentClass = RegionBehaviorPF2e;
        CONFIG.RegionBehavior.typeIcons.environment = "fa-solid fa-mountain-sun";
        CONFIG.RegionBehavior.typeIcons.environmentFeature = "fa-solid fa-wind";
        CONFIG.RegionBehavior.typeLabels.environment = "PF2E.Region.Environment.Label";
        CONFIG.RegionBehavior.typeLabels.environmentFeature = "PF2E.Region.EnvironmentFeature.Label";

        CONFIG.Scene.documentClass = ScenePF2e;
        CONFIG.Tile.documentClass = TileDocumentPF2e;

        CONFIG.Token.documentClass = TokenDocumentPF2e;
        CONFIG.Token.movement.TerrainData = TerrainDataPF2e;
        CONFIG.Token.objectClass = TokenPF2e;
        CONFIG.Token.prototypeSheetClass = PrototypeTokenConfigPF2e;
        CONFIG.Token.rulerClass = TokenRulerPF2e;
        Load.#configureMovement();

        CONFIG.User.documentClass = UserPF2e;

        // Actor system data models
        CONFIG.Actor.dataModels.army = ArmySystemData;
        CONFIG.Actor.dataModels.familiar = FamiliarSystemData;
        CONFIG.Actor.dataModels.hazard = HazardSystemData;
        CONFIG.Actor.dataModels.loot = LootSystemData;
        CONFIG.Actor.dataModels.party = PartySystemData;
        CONFIG.Actor.dataModels.vehicle = VehicleSystemData;

        // Item system data models
        if (BUILD_MODE !== "production") {
            CONFIG.Item.dataModels.affliction = AfflictionSystemData;
        }
        CONFIG.Item.dataModels.action = AbilitySystemData;
        CONFIG.Item.dataModels.campaignFeature = CampaignFeatureSystemData;
        CONFIG.Item.dataModels.class = ClassSystemData;
        CONFIG.Item.dataModels.condition = ConditionSystemData;
        CONFIG.Item.dataModels.effect = EffectSystemData;
        CONFIG.Item.dataModels.feat = FeatSystemData;
        CONFIG.Item.dataModels.heritage = HeritageSystemData;
        CONFIG.Item.dataModels.kit = KitSystemData;
        CONFIG.Item.dataModels.melee = MeleeSystemData;
        CONFIG.Item.dataModels.treasure = TreasureSystemData;

        // Assign canvas-related classes
        CONFIG.Canvas.doorControlClass = DoorControlPF2e;
        CONFIG.Canvas.exploredColor = 0x262626; // Increased from 0 (black)
        CONFIG.Canvas.groups.effects.groupClass = EffectsCanvasGroupPF2e;
        CONFIG.Canvas.groups.environment.groupClass = EnvironmentCanvasGroupPF2e;
        CONFIG.Canvas.layers.lighting.layerClass = LightingLayerPF2e;
        CONFIG.Canvas.layers.templates.layerClass = TemplateLayerPF2e;
        CONFIG.Canvas.layers.tokens.layerClass = TokenLayerPF2e;
        CONFIG.Canvas.rulerClass = RulerPF2e;

        CONFIG.Dice.rolls.push(CheckRoll, StrikeAttackRoll, DamageRoll, DamageInstance);
        for (const TermCls of [ArithmeticExpression, Grouping, InstancePool, IntermediateDie]) {
            CONFIG.Dice.termTypes[TermCls.name] = TermCls;
        }

        Math.btwn = (v, gte, lte) => v >= gte && v <= lte;
        Math.eq = (a, b) => a === b;
        Math.gt = (a, b) => a > b;
        Math.gte = (a, b) => a >= b;
        Math.lt = (a, b) => a < b;
        Math.lte = (a, b) => a <= b;
        Math.ne = (a, b) => a !== b;
        Math.ternary = (condition, ifTrue, ifFalse) => (condition ? ifTrue : ifFalse);

        Math.match = (...args) => args.find((a) => a !== null) ?? 0;
        Math.when = (condition, then) => (condition ? then : null);

        CONFIG.queries["pf2e.trade"] = TradeDialog.handleQuery;

        // Mystery Man but with a drop shadow
        Actor.DEFAULT_ICON = `${SYSTEM_ROOT}/icons/default-icons/mystery-man.svg`;

        // Inline link icons
        CONFIG.Actor.typeIcons = {
            familiar: "fa-solid fa-cat",
            hazard: "fa-solid fa-hill-rockslide",
            loot: "fa-solid fa-treasure-chest",
        };
        CONFIG.Item.typeIcons = {
            action: "fa-solid fa-person-running-fast",
            affliction: "fa-solid fa-biohazard",
            ancestry: "fa-solid fa-person-fairy",
            armor: "fa-solid fa-shirt-long-sleeve",
            background: "fa-solid fa-baby",
            backpack: "fa-solid fa-sack",
            book: "fa-solid fa-book",
            class: "fa-solid fa-user-beard-bolt",
            condition: "fa-solid fa-face-zany",
            consumable: "fa-solid fa-flask-round-potion",
            deity: "fa-solid fa-hamsa",
            effect: "fa-solid fa-person-rays",
            equipment: "fa-solid fa-hat-cowboy",
            feat: "fa-solid fa-medal",
            heritage: "fa-solid fa-wreath-laurel",
            shield: "fa-solid fa-shield-halved",
            spell: "fa-solid fa-sparkles",
            treasure: "fa-solid fa-gem",
            weapon: "fa-solid fa-sword",
        };

        // Make available immediately on load for module subclassing
        window.AutomaticBonusProgression = AutomaticBonusProgression;

        // Add custom HTML elements
        window.customElements.define(HTMLTagifyTagsElement.tagName, HTMLTagifyTagsElement);

        // Monkey-patch `TextEditor.enrichHTML`
        monkeyPatchFoundry();

        // Prevent buttons from retaining focus when clicked so that canvas hotkeys still work
        document.addEventListener("mouseup", (): void => {
            const element = document.activeElement;
            if (element instanceof HTMLButtonElement && !element.classList.contains("pm-dropdown")) {
                element.blur();
            }
        });

        this.#initializeHotReload();
    }

    static #configureMovement(): void {
        const movementActions = CONFIG.Token.movement.actions;
        for (const key of ["crawl", "climb", "jump"]) {
            delete movementActions[key]?.getCostFunction;
        }

        // Default action for creatures unless prone
        movementActions.walk.canSelect = (token) => {
            const actor = token.actor as ActorPF2e | null;
            return !!actor?.isOfType("creature") && !actor.hasCondition("prone");
        };
        movementActions.walk.img = null;

        // Default action for creatures when prone
        movementActions.crawl.canSelect = (token) => {
            const actor = token.actor as ActorPF2e | null;
            return !!actor?.isOfType("creature") && actor.hasCondition("prone");
        };

        // Default action for vehicles
        movementActions.drive = {
            label: "TOKEN.MOVEMENT.ACTIONS.drive.label",
            icon: "fa-solid fa-car-side",
            order: 0,
            canSelect: (t) => t.actor?.type === "vhiecle",
            deriveTerrainDifficulty: () => 1,
        };

        // Default action for armies
        movementActions.deploy = {
            label: "TOKEN.MOVEMENT.ACTIONS.deploy.label",
            icon: "fa-solid fa-person-military-pointing fa-flip-horizontal",
            order: 0,
            canSelect: (t) => t.actor?.type === "army",
        };

        movementActions.jump.order = 1;
        movementActions.jump.canSelect = (tokenDoc) => {
            const actor = tokenDoc.actor as ActorPF2e | null;
            return !!(actor?.isOfType("creature") && !actor.hasCondition("prone"));
        };
        movementActions.jump.deriveTerrainDifficulty = () => 1;

        movementActions.fly.order = 2;
        movementActions.fly.canSelect = (tokenDoc) => {
            const actor = tokenDoc.actor as ActorPF2e | null;
            return !!(actor?.isOfType("creature") && actor.system.movement.speeds.fly);
        };

        movementActions.burrow.order = 3;
        movementActions.burrow.canSelect = (tokenDoc) => {
            const actor = tokenDoc.actor as ActorPF2e | null;
            return !!(actor?.isOfType("creature") && actor.system.movement.speeds.burrow);
        };

        movementActions.climb.order = 4;
        movementActions.climb.canSelect = (tokenDoc) => {
            const actor = tokenDoc.actor as ActorPF2e | null;
            return !!actor?.isOfType("creature");
        };
        movementActions.climb.deriveTerrainDifficulty = () => 1;

        movementActions.swim.order = 5;
        movementActions.swim.canSelect = (tokenDoc) => {
            const actor = tokenDoc.actor as ActorPF2e | null;
            return !!actor?.isOfType("creature");
        };

        movementActions.travel = {
            order: 0,
            icon: "fa-solid fa-person-hiking",
            label: "TOKEN.MOVEMENT.ACTIONS.travel.label",
            canSelect: (tokenDoc) => {
                const actor = tokenDoc.actor as ActorPF2e | null;
                if (!actor) return false;
                return actor.isOfType("party") || (actor.isOfType("creature") && !actor.inCombat);
            },
        };

        movementActions.blink.order = 6;
    }

    /** Hot reload for localization and template files */
    static #initializeHotReload(): void {
        if (!import.meta.hot) return;

        function rerenderApps(path: string): void {
            const apps = [...Object.values(ui.windows), ...foundry.applications.instances.values()];
            for (const app of apps) {
                if (path.endsWith(".json") && app instanceof ActorSheetPF2e) {
                    resetActors([app.actor]);
                } else {
                    app.render();
                }
            }
            if (path.includes("system/effects")) game.pf2e.effectPanel.render();
        }

        import.meta.hot.on("lang-update", async ({ path }: { path: string }): Promise<void> => {
            const lang = await fu.fetchJsonWithTimeout(path);
            if (!R.isPlainObject(lang)) {
                ui.notifications.error(`Failed to load ${path}`);
                return;
            }
            const apply = (): void => {
                fu.mergeObject(game.i18n.translations, lang);
                rerenderApps(path);
            };
            if (game.ready) {
                apply();
            } else {
                Hooks.once("ready", apply);
            }
        });

        import.meta.hot.on("template-update", async ({ path }: { path: string }): Promise<void> => {
            const apply = async (): Promise<void> => {
                delete Handlebars.partials[path];
                await fa.handlebars.getTemplate(path);
                rerenderApps(path);
            };
            if (game.ready) {
                apply();
            } else {
                Hooks.once("ready", apply);
            }
        });
    }
}
