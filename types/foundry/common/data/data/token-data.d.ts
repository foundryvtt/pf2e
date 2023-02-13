declare module foundry {
    module data {
        /**
         * The data schema for a Token document.
         * @extends foundry.abstract.DocumentData
         * @memberof data
         *
         * @param data       Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id                  The Token _id which uniquely identifies it within its parent Scene
         * @property name                 The name used to describe the Token
         * @property [displayName=0]      The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES
         * @property actorId              The _id of an Actor document which this Token represents
         * @property [actorLink=false]    Does this Token uniquely represent a singular Actor, or is it one of many?
         * @property [actorData]          Token-level data which overrides the base data of the associated Actor
         * @property [width=1]            The width of the Token in grid units
         * @property [height=1]           The height of the Token in grid units
         * @property [scale=1]            A scale factor applied to the Token image, between 0.25 and 3
         * @property [mirrorX=false]      Flip the Token image horizontally?
         * @property [mirrorY=false]      Flip the Token image vertically?
         * @property [x=0]                The x-coordinate of the top-left corner of the Token
         * @property [y=0]                The y-coordinate of the top-left corner of the Token
         * @property [elevation=0]        The vertical elevation of the Token, in distance units
         * @property [lockRotation=false] Prevent the Token image from visually rotating?
         * @property [rotation=0]         The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token.
         * @property [effects]            An array of effect icon paths which are displayed on the Token
         * @property [overlayEffect]      A single icon path which is displayed as an overlay on the Token
         * @property [hidden=false]       Is the Token currently hidden from player view?
         * @property [vision]             Is this Token a source of vision?
         * @property [dimSight=0]         How far in distance units the Token can naturally see as if in dim light
         * @property [brightSight=0]      How far in distance units the Token can naturally see as if in bright light
         * @property [sightAngle=360]     The angle at which this Token is able to see, if it has vision
         * @property [light]              The angle at which this Token is able to see, if it has vision
         * @property [dimLight=0]         How far in distance units this Token emits dim light
         * @property [brightLight=0]      How far in distance units this Token emits bright light
         * @property [lightAngle=360]     The angle at which this Token is able to emit light
         * @property [lightAnimation]     A data object which configures token light animation settings
         * @property [disposition=-1]     A displayed Token disposition from CONST.TOKEN_DISPOSITIONS
         * @property [displayBars=0]      The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES
         * @property [bar1]               The configuration of the Token's primary resource bar
         * @property [bar2]               The configuration of the Token's secondary resource bar
         * @property [flags={}]           An object of optional key/value flags
         */
        interface TokenSource extends TokenLightData {
            _id: string;
            name: string;

            // Navigation
            active: boolean;
            navigation: boolean;
            navOrder: number;
            navName: string;

            actorId: string | null;
            actorLink: boolean;
            actorData: DeepPartial<ActorSource>;
            mirrorX: boolean;
            mirrorY: boolean;
            height: number;
            width: number;
            x: number;
            y: number;
            elevation: number;
            lockRotation: boolean;
            effects: VideoFilePath[];
            overlayEffect: string | null;
            vision: boolean;
            dimSight: number;
            brightSight: number;
            sightAngle: number;
            light: LightSource;
            hidden: boolean;
            texture: {
                src: VideoFilePath;
                scaleX: number;
                scaleY: number;
                offsetX: number;
                offsetY: number;
                rotation: number | null;
                tint: `#${string}`;
            };

            lightAnimation: AnimationSource;
            disposition: TokenDisposition;
            displayName: TokenDisplayMode;
            displayBars: TokenDisplayMode;
            bar1: TokenBarSource;
            bar2: TokenBarSource;
            flags: Record<string, Record<string, unknown>>;
        }

        class TokenData<
            TDocument extends documents.BaseToken = documents.BaseToken
        > extends abstract.DocumentData<TDocument> {
            lightAnimation: AnimationData<TDocument>;

            bar1: TokenBarData<TDocument>;

            bar2: TokenBarData<TDocument>;
        }

        interface TokenData extends Omit<TokenSource, "lightAnimation" | "light" | "bar1" | "bar2"> {
            readonly _source: TokenSource;

            light: LightData<NonNullable<this["document"]>>;

            get schema(): ReturnType<(typeof ItemData)["defineSchema"]>;
        }

        namespace TokenData {
            const schema: ReturnType<(typeof TokenData)["defineSchema"]>;

            const _schema: ReturnType<(typeof TokenData)["defineSchema"]> | undefined;
        }
    }
}

declare interface TokenLightData {
    brightLight: number;
    dimLight: number;
    lightAlpha: number;
    lightAngle: number;
    lightAnimation: {
        type: string;
        speed: number;
        intensity: number;
    };
    lightColor: string;
}
