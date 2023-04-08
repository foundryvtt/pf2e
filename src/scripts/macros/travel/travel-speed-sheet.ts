import {
    calculateNormalizedCharacterSpeed,
    calculateTravelDuration,
    DetectionMode,
    ExplorationActivities,
    ExplorationOptions,
    LengthUnit,
    speedToVelocity,
    Terrain,
    TravelDuration,
    Trip,
} from "./travel-speed.ts";
import { Fraction, zip } from "@util";
import { CharacterPF2e } from "@actor/character/document.ts";

type DetectionModeData = "none" | "everything" | "before";
type SpeedUnitData = "feet" | "miles";
type TerrainData = "normal" | "difficult" | "greaterDifficult";
type ExplorationActivitiesData =
    | "AvoidNotice"
    | "CoverTracks"
    | "Defend"
    | "DetectMagic"
    | "Investigate"
    | "RepeatASpell"
    | "Scout"
    | "Search"
    | "Track"
    | "None"
    | "HalfSpeed";

/*
TODO:

// feats
https://2e.aonprd.com/Feats.aspx?ID=1439
https://2e.aonprd.com/Feats.aspx?ID=1987
https://2e.aonprd.com/Feats.aspx?ID=2138
https://2e.aonprd.com/Feats.aspx?ID=2126
https://2e.aonprd.com/Feats.aspx?ID=928
https://2e.aonprd.com/Feats.aspx?ID=2051
https://2e.aonprd.com/Feats.aspx?ID=547

effects
https://2e.aonprd.com/Spells.aspx?ID=588
https://2e.aonprd.com/Spells.aspx?ID=275
https://2e.aonprd.com/Spells.aspx?ID=105
https://2e.aonprd.com/Spells.aspx?ID=350
https://2e.aonprd.com/Spells.aspx?ID=368
 */

/*
Possible example of how we could implement modifiers

const baseSpeed =
const overlandSpeed = new CheckModifier(baseSpeed);
overlandSpeed.modifiers().forEach((m) => {
    m.ignored = ModifierPredicate.test(m.predicate, ['overland']);
});
overlandSpeed.applyStackRules();
console.log(overlandSpeed.totalModifier);

{
  "key": "PF2E.RuleElement.FlatModifier",
  "selector": "speed",
  "label": "Travel Speed Feat",
  "value": "10",
  "type": "circumstance",
  "predicate": {
    "all": ["travel"]
  }
}
 */

interface FormActorData {
    detectionMode: DetectionModeData;
    explorationActivity: ExplorationActivitiesData;
    speed: number;
}

interface TravelFormData {
    actors: FormActorData[];
    hustleMinutes: number;
    distance: number;
    distanceUnit: SpeedUnitData;
    terrain: TerrainData;
    hoursPerDay: number;
    normalTerrainSlowdown: Fraction;
    difficultTerrainSlowdown: Fraction;
    greaterDifficultTerrainSlowdown: Fraction;
}

interface SheetActorData extends FormActorData {
    explorationSpeed: number;
    name: string;
    requiresDetectionMode: boolean;
}

interface SheetData extends TravelFormData {
    actors: SheetActorData[];
    travelDuration: TravelDuration;
    partySpeedInFeet: number;
}

interface TravelSpeedSheetOptions extends FormApplicationOptions {
    actors: CharacterPF2e[];
}

class TravelSpeedSheet extends FormApplication<{}, TravelSpeedSheetOptions> {
    private formData?: TravelFormData = undefined;

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "travel-duration";
        options.classes = ["travel-duration"];
        options.title = game.i18n.localize("PF2E.TravelSpeed.Title");
        options.template = "systems/pf2e/templates/gm/travel/travel-speed-sheet.hbs";
        options.width = "auto";
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const data = expandObject(formData) as TravelFormData;
        data.actors = toArray(data.actors);
        this.formData = data;
        this.render(true);
    }

    private actorFormToSheetData(actor: CharacterPF2e, data: FormActorData): SheetActorData {
        return {
            requiresDetectionMode: data.explorationActivity === "Search" || data.explorationActivity === "DetectMagic",
            detectionMode: data.detectionMode,
            explorationActivity: data.explorationActivity,
            explorationSpeed: parseFloat(
                calculateNormalizedCharacterSpeed(
                    data.speed,
                    parseExplorationActivity(data.explorationActivity),
                    parseDetectionModeData(data.detectionMode),
                    parseExplorationOptions(actor)
                ).toFixed(2)
            ),
            speed: data.speed,
            name: actor.name,
        };
    }

    private getInitialActorData(actor: CharacterPF2e): SheetActorData {
        return this.actorFormToSheetData(actor, {
            detectionMode: "before",
            explorationActivity: "Search",
            speed: actor.system.attributes.speed.total,
        });
    }

    private formToSheetData(actors: CharacterPF2e[], data: TravelFormData): SheetData {
        const journey: Trip[] = [
            {
                terrainSlowdown: {
                    difficult: data.difficultTerrainSlowdown,
                    greaterDifficult: data.greaterDifficultTerrainSlowdown,
                    normal: data.normalTerrainSlowdown,
                },
                terrain: parseTerrainData(data.terrain),
                distance: {
                    value: data.distance,
                    unit: parseDistanceUnit(data.distanceUnit),
                },
            },
        ];
        const actorFormData = zip(actors, data.actors, (actor, actorData) =>
            this.actorFormToSheetData(actor, actorData)
        );
        const partySpeedInFeet = Math.min(...actorFormData.map((data) => data.explorationSpeed));
        const velocity = speedToVelocity(partySpeedInFeet);
        return {
            travelDuration: calculateTravelDuration({
                journey,
                hoursPerDay: data.hoursPerDay,
                velocity,
                hustleDurationInMinutes: data.hustleMinutes,
            }),
            distance: data.distance,
            actors: actorFormData,
            normalTerrainSlowdown: data.normalTerrainSlowdown,
            difficultTerrainSlowdown: data.difficultTerrainSlowdown,
            greaterDifficultTerrainSlowdown: data.greaterDifficultTerrainSlowdown,
            distanceUnit: data.distanceUnit,
            terrain: data.terrain,
            partySpeedInFeet,
            hustleMinutes: data.hustleMinutes,
            hoursPerDay: data.hoursPerDay,
        };
    }

    private getInitialFormData(actors: CharacterPF2e[]): SheetData {
        return this.formToSheetData(actors, {
            actors: actors.map((actor) => this.getInitialActorData(actor)),
            terrain: "normal",
            distanceUnit: "miles",
            normalTerrainSlowdown: { denominator: 1, numerator: 1 },
            difficultTerrainSlowdown: { denominator: 1, numerator: 2 },
            greaterDifficultTerrainSlowdown: { denominator: 1, numerator: 3 },
            distance: 1,
            hustleMinutes: getHustleMinutes(actors),
            hoursPerDay: 8,
        });
    }

    override getData() {
        const sheetData = super.getData();
        let data: SheetData;
        if (this.formData === undefined) {
            data = this.getInitialFormData(this.options.actors);
        } else {
            data = this.formToSheetData(this.options.actors, this.formData);
        }
        Object.assign(sheetData, data);
        return sheetData;
    }
}

function parseDistanceUnit(unit: SpeedUnitData): LengthUnit {
    if (unit === "feet") {
        return LengthUnit.FEET;
    } else {
        return LengthUnit.MILES;
    }
}

function parseTerrainData(terrain: TerrainData): Terrain {
    if (terrain === "normal") {
        return Terrain.NORMAL;
    } else if (terrain === "difficult") {
        return Terrain.DIFFICULT;
    } else {
        return Terrain.GREATER_DIFFICULT;
    }
}

function parseDetectionModeData(detectionMode: DetectionModeData): DetectionMode {
    if (detectionMode === "none") {
        return DetectionMode.NONE;
    } else if (detectionMode === "before") {
        return DetectionMode.DETECT_BEFORE_WALKING_INTO_IT;
    } else {
        return DetectionMode.DETECT_EVERYTHING;
    }
}

function parseExplorationActivity(activity: ExplorationActivitiesData): ExplorationActivities {
    if (activity === "AvoidNotice") {
        return ExplorationActivities.AVOID_NOTICE;
    } else if (activity === "Defend") {
        return ExplorationActivities.DEFEND;
    } else if (activity === "DetectMagic") {
        return ExplorationActivities.DETECT_MAGIC;
    } else if (activity === "Scout") {
        return ExplorationActivities.SCOUT;
    } else if (activity === "Search") {
        return ExplorationActivities.SEARCH;
    } else if (activity === "None") {
        return ExplorationActivities.NONE;
    } else {
        return ExplorationActivities.HALF_SPEED;
    }
}

/**
 * You strain yourself to move at double your travel speed.
 * You can Hustle only for a number of minutes equal to your Constitution modifier × 10 (minimum 10 minutes).
 * @param actors
 * @return possible minutes spent hustling
 */
function getHustleMinutes(actors: CharacterPF2e[]): number {
    return Math.min(
        ...actors.map((actor) => {
            return Math.max(1, actor.system.abilities.con.mod) * 10;
        })
    );
}

function hasFeat(actor: CharacterPF2e, slug: string): boolean {
    return actor.itemTypes.feat.some((feat) => feat.slug === slug);
}

function parseExplorationOptions(actor: CharacterPF2e): ExplorationOptions {
    // FIXME: instead of matching the name these should probably be rule toggles at some point
    return {
        practicedDefender: hasFeat(actor, "practiced-defender"),
        swiftSneak: hasFeat(actor, "swift-sneak"),
        legendarySneak: hasFeat(actor, "legendary-sneak"),
        expeditiousSearch: hasFeat(actor, "expeditious-search"),
        expeditiousSearchLegendary: hasFeat(actor, "expeditious-search") && actor.attributes.perception.rank === 4,
    };
}

/**
 * Turns {0: {...}, {1: {...}}} into [{...}, {...}]
 * @param data
 */
function toArray<T>(data: Record<number, T>): T[] {
    return Object.entries(data)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([_, a]) => a);
}

export function launchTravelSheet(actors: CharacterPF2e[]): void {
    new TravelSpeedSheet({}, { actors }).render(true);
}
