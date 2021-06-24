declare namespace foundry {
    module data {
        /** Extend the base TokenData to define a PrototypeToken which exists within a parent Actor.
         * @property _id                  The Token _id which uniquely identifies it within its parent Scene
         * @property name                 The name used to describe the Token
         * @property [displayName=0]      The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES
         * @property actorId              The _id of an Actor document which this Token represents
         * @property [actorLink=false]    Does this Token uniquely represent a singular Actor, or is it one of many?
         * @property img                  A file path to an image or video file used to depict the Token
         * @property [randomImg=false]    Uses a random "wildcard" image path which is resolved with a Token is created
         * @property [tint=null]          An optional color tint applied to the Token image
         * @property [width=1]            The width of the Token in grid units
         * @property [height=1]           The height of the Token in grid units
         * @property [scale=1]            A scale factor applied to the Token image, between 0.25 and 3
         * @property [mirrorX=false]      Flip the Token image horizontally?
         * @property [mirrorY=false]      Flip the Token image vertically?
         * @property [lockRotation=false] Prevent the Token image from visually rotating?
         * @property [rotation=0]         The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token.
         * @property [vision]             Is this Token a source of vision?
         * @property [dimSight=0]         How far in distance units the Token can naturally see as if in dim light
         * @property [brightSight=0]      How far in distance units the Token can naturally see as if in bright light
         * @property [sightAngle=360]     The angle at which this Token is able to see, if it has vision
         * @property [dimLight=0]         How far in distance units this Token emits dim light
         * @property [brightLight=0]      How far in distance units this Token emits bright light
         * @property [lightAngle=360]     The angle at which this Token is able to emit light
         * @property [lightAnimation]     A data object which configures token light animation settings
         * @property [disposition=-1]     A displayed Token disposition from CONST.TOKEN_DISPOSITIONS
         * @property [displayBars=0]      The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES
         * @property [bar1]               The configuration of the Token's primary resource bar
         * @property [bar2]               The configuration of the Token's secondary resource bar
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
            static override defineSchema(): abstract.DocumentSchema;

            protected override _initialize(): void;

            override toJSON(): this['_source'];

            lightAnimation: AnimationData<TDocument>;

            bar1: TokenBarData<TDocument>;

            bar2: TokenBarData<TDocument>;
        }

        interface PrototypeTokenData extends Omit<PrototypeTokenSource, 'lightAnimation' | 'bar1' | 'bar2'> {
            readonly _source: PrototypeTokenSource;
        }
    }
}
