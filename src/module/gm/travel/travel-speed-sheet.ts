import {
    calculateCharacterSpeed,
    calculateTravelDuration,
    DetectionMode,
    ExplorationActivities,
    ExplorationOptions,
    LengthUnit,
    speedToVelocity,
    Terrain,
    Trip,
} from './travel-speed';
import { Fraction } from '../../utils';

type DetectionModeData = 'none' | 'everything' | 'before';
type SpeedUnitData = 'feet' | 'miles';
type TerrainData = 'normal' | 'difficult' | 'greaterDifficult';
type ExplorationActitiviesData =
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

interface FormData {
    detectionMode: DetectionModeData[];
    speed: string[];
    explorationActivity: string[];
    distance: number;
    distanceUnit: SpeedUnitData;
    terrain: TerrainData;
    normalTerrainPenalty: Fraction;
    difficultTerrainPenalty: Fraction;
    greaterDifficultTerrainPenalty: Fraction;
}

class TravelSpeedSheet extends FormApplication {
    private travelPlan: FormData = undefined;

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

    async _updateObject(event: Event, formData: FormData) {
        this.travelPlan = formData;
        this.render(true);
    }

    getData() {
        // TODO: assign previous state as well
        const sheetData = super.getData();
        sheetData.actors = this.options.actors.map((actor: Actor) => {
            const speed = actor.data.data.attributes.speed.total;
            return {
                speed,
                name: actor.name,
                explorationSpeed: calculateCharacterSpeed(
                    speed,
                    parseExplorationActivity(),
                    parseDetectionModeData(),
                    parseExplorationOptions(actor),
                ),
            };
        });
        if (this.travelPlan !== undefined) {
            const journey: Trip[] = [
                {
                    terrainSlowdown: {
                        difficult: this.travelPlan.difficultTerrainPenalty,
                        greaterDifficult: this.travelPlan.greaterDifficultTerrainPenalty,
                        normal: this.travelPlan.normalTerrainPenalty,
                    },
                    terrain: parseTerrainData(this.travelPlan.terrain),
                    distance: {
                        value: this.travelPlan.distance,
                        unit: parseDistanceUnit(this.travelPlan.distanceUnit),
                    },
                },
            ];
            // FIXME: get lowest actor speed here
            const velocity = speedToVelocity(30);
            sheetData.travelDuration = calculateTravelDuration(journey, velocity);
        }
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

function parseExplorationActivity(activity: ExplorationActitiviesData): ExplorationActivities {
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

export function launchTravelSheet(actors: Actor[]): void {
    new TravelSpeedSheet(null, { actors }).render(true);
}
