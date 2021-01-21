import {
    calculateNormalizedCharacterSpeed,
    calculateTravelDuration,
    DetectionMode,
    ExplorationActivities,
    ExplorationOptions,
    LengthUnit,
    speedToVelocity,
    Terrain,
    TerrainSlowdown,
    Trip,
} from '../../../../src/module/gm/travel/travel-speed';

const terrainModifiers: TerrainSlowdown = {
    normal: { numerator: 1, denominator: 1 },
    difficult: { numerator: 1, denominator: 2 },
    greaterDifficult: { numerator: 1, denominator: 3 },
};

const defaultExplorationOptions: ExplorationOptions = {
    expeditiousSearch: false,
    expeditiousSearchLegendary: false,
    swiftSneak: false,
    legendarySneak: false,
    practicedDefender: false,
};

describe('test travel speed', () => {
    test('character speed', () => {
        expect(
            calculateNormalizedCharacterSpeed(40, ExplorationActivities.NONE, DetectionMode.NONE, defaultExplorationOptions),
        ).toEqual(40);
    });

    test('character speed when defending', () => {
        expect(
            calculateNormalizedCharacterSpeed(40, ExplorationActivities.DEFEND, DetectionMode.NONE, defaultExplorationOptions),
        ).toEqual(20);
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.DEFEND,
                DetectionMode.NONE,
                Object.assign({}, defaultExplorationOptions, { practicedDefender: true }),
            ),
        ).toEqual(40);
    });

    test('character speed when avoiding notice', () => {
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.AVOID_NOTICE,
                DetectionMode.NONE,
                defaultExplorationOptions,
            ),
        ).toEqual(20);
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.AVOID_NOTICE,
                DetectionMode.NONE,
                Object.assign({}, defaultExplorationOptions, { legendarySneak: true }),
            ),
        ).toEqual(40);
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.AVOID_NOTICE,
                DetectionMode.NONE,
                Object.assign({}, defaultExplorationOptions, { swiftSneak: true }),
            ),
        ).toEqual(40);
    });

    test('character speed when searching', () => {
        expect(
            calculateNormalizedCharacterSpeed(40, ExplorationActivities.SEARCH, DetectionMode.NONE, defaultExplorationOptions),
        ).toEqual(20);
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.SEARCH,
                DetectionMode.DETECT_EVERYTHING,
                defaultExplorationOptions,
            ),
        ).toEqual(20);
        expect(
            calculateNormalizedCharacterSpeed(
                70,
                ExplorationActivities.SEARCH,
                DetectionMode.DETECT_EVERYTHING,
                defaultExplorationOptions,
            ),
        ).toEqual(30);
        expect(
            calculateNormalizedCharacterSpeed(
                120,
                ExplorationActivities.SEARCH,
                DetectionMode.DETECT_EVERYTHING,
                Object.assign({}, defaultExplorationOptions, { expeditiousSearch: true }),
            ),
        ).toEqual(60);
        expect(
            calculateNormalizedCharacterSpeed(
                140,
                ExplorationActivities.SEARCH,
                DetectionMode.DETECT_EVERYTHING,
                Object.assign({}, defaultExplorationOptions, { expeditiousSearchLegendary: true }),
            ),
        ).toEqual(70);
        expect(
            calculateNormalizedCharacterSpeed(
                40,
                ExplorationActivities.SEARCH,
                DetectionMode.DETECT_BEFORE_WALKING_INTO_IT,
                defaultExplorationOptions,
            ),
        ).toEqual(15);
    });

    test('travel time', () => {
        const journey: Trip[] = [
            {
                distance: {
                    value: 51,
                    unit: LengthUnit.MILES,
                },
                terrain: Terrain.NORMAL,
                terrainSlowdown: terrainModifiers,
            },
        ];
        const velocity = speedToVelocity(25);
        expect(calculateTravelDuration(journey, velocity)).toEqual({
            weeks: 0,
            days: 2,
            hours: 4,
            minutes: 24,
        });
    });
});
