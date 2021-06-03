declare namespace foundry {
    module data {
        /** Extend the base TokenData to define a PrototypeToken which exists within a parent Actor.
         * @property {string} _id                 The Token _id which uniquely identifies it within its parent Scene
         * @property {string} name                The name used to describe the Token
         * @property {number} [displayName=0]     The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES
         * @property {string|null} actorId        The _id of an Actor document which this Token represents
         * @property {boolean} [actorLink=false]  Does this Token uniquely represent a singular Actor, or is it one of many?
         * @property {string} img                 A file path to an image or video file used to depict the Token
         * @property {boolean} [randomImg=false]  Uses a random "wildcard" image path which is resolved with a Token is created
         * @property {string} [tint=null]         An optional color tint applied to the Token image
         * @property {number} [width=1]           The width of the Token in grid units
         * @property {number} [height=1]          The height of the Token in grid units
         * @property {number} [scale=1]           A scale factor applied to the Token image, between 0.25 and 3
         * @property {boolean} [mirrorX=false]    Flip the Token image horizontally?
         * @property {boolean} [mirrorY=false]    Flip the Token image vertically?
         * @property {boolean} [lockRotation=false]  Prevent the Token image from visually rotating?
         * @property {number} [rotation=0]        The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token.
         * @property {boolean} [vision]           Is this Token a source of vision?
         * @property {number} [dimSight=0]        How far in distance units the Token can naturally see as if in dim light
         * @property {number} [brightSight=0]     How far in distance units the Token can naturally see as if in bright light
         * @property {number} [sightAngle=360]    The angle at which this Token is able to see, if it has vision
         * @property {number} [dimLight=0]        How far in distance units this Token emits dim light
         * @property {number} [brightLight=0]     How far in distance units this Token emits bright light
         * @property {number} [lightAngle=360]    The angle at which this Token is able to emit light
         * @property {data.AnimationData} [lightAnimation] A data object which configures token light animation settings
         * @property {number} [disposition=-1]    A displayed Token disposition from CONST.TOKEN_DISPOSITIONS
         * @property {number} [displayBars=0]     The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES
         * @property {TokenBarData} [bar1]        The configuration of the Token's primary resource bar
         * @property {TokenBarData} [bar2]        The configuration of the Token's secondary resource bar
         */
        interface PrototypeTokenSource {
            _id: string;
            name: string;
            displayName: number;
            actorId: string | null;
            actorLink: boolean;
            img: string;
            randomImg: boolean;
            tint: string | null;
            width: number;
            height: number;
            scale: number;
            mirrorX: boolean;
            mirrorY: boolean;
            lockRotation: boolean;
            rotation: number;
            vision: boolean;
            dimSight: number;
            brightSight: number;
            sightAngle: number;
            dimLight: number;
            brightLight: number;
            lightAngle: number;
            lightAnimation: AnimationSource;
            disposition: TokenDisposition;
            displayBars: number;
            bar1: TokenBarSource;
            bar2: TokenBarSource;
        }

        class PrototypeTokenData<
            TDocument extends documents.BaseActor = documents.BaseActor,
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;

            /** @override */
            protected _initialize(): void;

            /** @override */
            toJSON(): PrototypeTokenSource;

            lightAnimation: AnimationData<TDocument>;

            bar1: TokenBarData<TDocument>;

            bar2: TokenBarData<TDocument>;
        }

        interface PrototypeTokenData extends Omit<PrototypeTokenSource, 'lightAnimation' | 'bar1' | 'bar2'> {
            readonly _source: PrototypeTokenSource;
        }
    }
}
