import {
    calculateCharacterSpeed,
    calculateTravelDuration,
    DetectionMode,
    ExplorationActivities,
    ExplorationOptions,
    LengthUnit,
    speedToVelocity,
    Terrain,
    TravelDuration,
    Trip,
} from './travel-speed';
import { Fraction, zip } from '../../utils';

type DetectionModeData = 'none' | 'everything' | 'before';
type SpeedUnitData = 'feet' | 'miles';
type TerrainData = 'normal' | 'difficult' | 'greaterDifficult';
type ExplorationActivitiesData =
    | 'AvoidNotice'
    | 'CoverTracks'
    | 'Defend'
    | 'DetectMagic'
    | 'Investigate'
    | 'RepeatASpell'
    | 'Scout'
    | 'Search'
    | 'Track'
    | 'None'
    | 'HalfSpeed';

// relevant feats
/*
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
const baseSpeed = 
const overlandSpeed = new PF2CheckModifier(baseSpeed);
overlandSpeed.modifiers().forEach((m) => {
    m.ignored = PF2ModifierPredicate.test(m.predicate, ['overland']);
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

interface FormData {
    actors: FormActorData[];
    distance: number;
    distanceUnit: SpeedUnitData;
    terrain: TerrainData;
    normalTerrainPenalty: Fraction;
    difficultTerrainPenalty: Fraction;
    greaterDifficultTerrainPenalty: Fraction;
}

interface SheetActorData extends FormActorData {
    explorationSpeed: number;
    name: string;
}

interface SheetData extends FormData {
    actors: SheetActorData[];
    travelDuration: TravelDuration;
}

class TravelSpeedSheet extends FormApplication {
    private formData?: FormData = undefined;

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'travel-speed';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.TravelSpeed.Title');
        options.template = 'systems/pf2e/templates/gm/travel/travel-speed-sheet.html';
        options.width = 'auto';
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    async _updateObject(event: Event, formData: any) {
        const data: any = expandObject(formData);
        data.actors = toArray(data.actors);
        this.formData = data;
        this.render(true);
    }

    private actorFormToSheetData(actor: Actor, data: FormActorData): SheetActorData {
        return {
            detectionMode: data.detectionMode,
            explorationActivity: data.explorationActivity,
            explorationSpeed: calculateCharacterSpeed(
                data.speed,
                parseExplorationActivity(data.explorationActivity),
                parseDetectionModeData(data.detectionMode),
                parseExplorationOptions(actor),
            ),
            speed: data.speed,
            name: actor.name,
        };
    }

    private getInitialActorData(actor: Actor): SheetActorData {
        return this.actorFormToSheetData(actor, {
            detectionMode: 'before',
            explorationActivity: 'Search',
            speed: actor.data.data.attributes.speed.total,
        });
    }

    private formToSheetData(actors: Actor[], data: FormData): SheetData {
        const journey: Trip[] = [
            {
                terrainSlowdown: {
                    difficult: data.difficultTerrainPenalty,
                    greaterDifficult: data.greaterDifficultTerrainPenalty,
                    normal: data.normalTerrainPenalty,
                },
                terrain: parseTerrainData(data.terrain),
                distance: {
                    value: data.distance,
                    unit: parseDistanceUnit(data.distanceUnit),
                },
            },
        ];
        const actorFormData = zip(actors, data.actors, (actor, actorData) =>
            this.actorFormToSheetData(actor, actorData),
        );
        const minSpeedInFeet = Math.min(...actorFormData.map((data) => data.explorationSpeed));
        const velocity = speedToVelocity(minSpeedInFeet);
        return {
            travelDuration: calculateTravelDuration(journey, velocity),
            distance: data.distance,
            actors: actorFormData,
            normalTerrainPenalty: data.normalTerrainPenalty,
            difficultTerrainPenalty: data.difficultTerrainPenalty,
            greaterDifficultTerrainPenalty: data.greaterDifficultTerrainPenalty,
            distanceUnit: data.distanceUnit,
            terrain: data.terrain,
        };
    }

    private getInitialFormData(actors: Actor[]): SheetData {
        return this.formToSheetData(actors, {
            actors: actors.map((actor) => this.getInitialActorData(actor)),
            terrain: 'normal',
            distanceUnit: 'miles',
            normalTerrainPenalty: { denominator: 1, numerator: 1 },
            difficultTerrainPenalty: { denominator: 1, numerator: 2 },
            greaterDifficultTerrainPenalty: { denominator: 1, numerator: 3 },
            distance: 1,
        });
    }

    getData() {
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
    if (unit === 'feet') {
        return LengthUnit.FEET;
    } else {
        return LengthUnit.MILES;
    }
}

function parseTerrainData(terrain: TerrainData): Terrain {
    if (terrain === 'normal') {
        return Terrain.NORMAL;
    } else if (terrain === 'difficult') {
        return Terrain.DIFFICULT;
    } else {
        return Terrain.GREATER_DIFFICULT;
    }
}

function parseDetectionModeData(detectionMode: DetectionModeData): DetectionMode {
    if (detectionMode === 'none') {
        return DetectionMode.NONE;
    } else if (detectionMode === 'before') {
        return DetectionMode.DETECT_BEFORE_WALKING_INTO_IT;
    } else {
        return DetectionMode.DETECT_EVERYTHING;
    }
}

function parseExplorationActivity(activity: ExplorationActivitiesData): ExplorationActivities {
    if (activity === 'AvoidNotice') {
        return ExplorationActivities.AVOID_NOTICE;
    } else if (activity === 'Defend') {
        return ExplorationActivities.DEFEND;
    } else if (activity === 'DetectMagic') {
        return ExplorationActivities.DETECT_MAGIC;
    } else if (activity === 'Scout') {
        return ExplorationActivities.SCOUT;
    } else if (activity === 'Search') {
        return ExplorationActivities.SEARCH;
    } else if (activity === 'None') {
        return ExplorationActivities.NONE;
    } else {
        return ExplorationActivities.HALF_SPEED;
    }
}

function hasFeat(actor: Actor, name: string): boolean {
    return actor.data.items.some((item) => item.type === 'feat' && item.name?.trim() === name);
}

function parseExplorationOptions(actor: Actor): ExplorationOptions {
    // FIXME: instead of matching the name these should probably be rule toggles at some point
    return {
        practicedDefender: hasFeat(actor, 'Practiced Defender'),
        swiftSneak: hasFeat(actor, 'Swift Sneak'),
        legendarySneak: hasFeat(actor, 'Legendary Sneak'),
        expeditiousSearch: hasFeat(actor, 'Expeditious Search'),
        expeditiousSearchLegendary:
            hasFeat(actor, 'Expeditious Search') && actor.data.data.attributes?.perception?.rank === 4,
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

export function launchTravelSheet(actors: Actor[]): void {
    new TravelSpeedSheet(null, { actors }).render(true);
}
