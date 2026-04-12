import SpriteMesh from "../containers/elements/sprite-mesh.mjs";
import PlaceableObject from "../placeables/placeable-object.mjs";
import PrimaryCanvasParticleContainer from "../primary/primary-canvas-particle-container.mjs";

export type ParticleGeneratorMode = "ambient" | "effect";

/**
 * A numeric range:
 * - number: a fixed value
 * - [min, max]: a uniform range
 * - {min, max}: a uniform range
 */
export type ParticleGeneratorRange = number | number[] | { min: number; max: number };

export type ParticleGeneratorPoint = PIXI.IPointData;

/**
 * An anchor source used to attach spawn areas and behaviors to a moving object.
 * Supported sources:
 * - A {@link PlaceableObject} (for example a Token): uses {@link ParticleGeneratorAnchorPoint} to choose a point.
 * - A point in scene coordinates.
 * - A function which returns a point-like object in scene coordinates.
 */
export type ParticleGeneratorAnchor =
    | PlaceableObject
    | ParticleGeneratorPoint
    | (() => { x: number; y: number })
    | null;

/**
 * Which point to use when anchoring to an object.
 * - "center": use `source.center` when available (recommended for Tokens).
 * - "position": use `{x: source.x, y: source.y}`.
 * - function: invoked as (source) => ({x, y}).
 */
export type ParticleGeneratorAnchorPoint =
    | "center"
    | "position"
    | ((source: PlaceableObject) => { x: number; y: number });

export type ParticleGeneratorBehaviorId = "default" | "orbit" | "follow";

export interface ParticleGeneratorOrbitOptions {
    /**
     * Orbit radius in pixels.
     * If null, use the particle's initial distance from the anchor.
     * @defaultValue null
     */
    radius?: ParticleGeneratorRange | null;
    /**
     * Angular speed in degrees per second.
     * @defaultValue 120
     */
    angularSpeed?: ParticleGeneratorRange;
    /**
     * Initial angle in degrees.
     * Only used when {@link ParticleGeneratorOrbitOptions#radius} is provided.
     * @defaultValue [0, 360]
     */
    phase?: ParticleGeneratorRange;
    /**
     * Radial speed in pixels per second.
     * @defaultValue 0
     */
    radialSpeed?: ParticleGeneratorRange;
    /**
     * Orbit direction.
     * @defaultValue 1
     */
    direction?: 1 | -1 | "random";
    /**
     * If set, override sprite rotation each frame.
     * @defaultValue "none"
     */
    rotation?: "none" | "tangent" | "radial";
}

export interface ParticleGeneratorFollowOptions {
    /**
     * Fixed local offset from the anchor in pixels.
     * If null, use the particle's initial offset from the anchor.
     * @defaultValue null
     */
    offset?: ParticleGeneratorPoint | null;
    /**
     * A 0..1 smoothing factor. 1 snaps to the target every frame.
     * @defaultValue 1
     */
    stiffness?: number;
}

export interface ParticleGeneratorBehavior {
    /** Called once during construction. */
    initialize?: (generator: ParticleGenerator) => void;
    /** Called for each spawned particle. */
    spawn?: (particle: ParticleMesh, ctx: object) => void;
    /**
     * Called for each particle during update.
     * Return true to indicate the behavior handled positional integration for this particle.
     */
    update?: (particle: ParticleMesh, dt: number, ctx: object) => boolean | void;
}

/**
 * A spawn area definition in scene coordinates.
 * When an {@link ParticleGeneratorAnchor} is provided, object-based areas are interpreted as offsets relative
 * to the anchor point. To provide an absolute rectangle while anchored, pass a {@link PIXI.Rectangle}.
 * Supported shapes:
 * - Point: `{x, y}`
 * - Rect: `{x, y, width, height}` or `PIXI.Rectangle`
 * - Circle: `{x, y, radius}`
 * - Ring: `{x, y, innerRadius, outerRadius}` or `{x, y, radius: [inner, outer]}`
 * - Line: `{from: {x, y}, to: {x, y}}`
 */
export type ParticleGeneratorArea =
    | PIXI.Rectangle
    | ParticleGeneratorPoint
    | { x: number; y: number; width: number; height: number }
    | { x: number; y: number; radius: number | number[] }
    | { x: number; y: number; innerRadius: number; outerRadius: number }
    | { from: ParticleGeneratorPoint; to: ParticleGeneratorPoint };

export interface ParticleGeneratorFadeOptions {
    /**
     * Fade-in duration in milliseconds, or a fraction of lifetime if 0 < value < 1.
     * @defaultValue 0
     */
    in?: number;
    /**
     * Fade-out duration in milliseconds, or a fraction of lifetime if 0 < value < 1.
     * @defaultValue 0
     */
    out?: number;
}

/**
 * Particle velocity configuration.
 * Supported shapes:
 * - Fixed vector: `{x, y}`
 * - Cartesian ranges: `{x: range, y: range}`
 * - Polar: `{speed: range, angle: range}` where angle is in degrees
 */
export type ParticleGeneratorVelocityOptions =
    | ParticleGeneratorPoint
    | { x: ParticleGeneratorRange; y: ParticleGeneratorRange }
    | { speed: ParticleGeneratorRange; angle: ParticleGeneratorRange };

export type ParticleGeneratorConstraintMode = "none" | "kill" | "clamp" | "wrap" | "bounce";

export type ParticleGeneratorDebugTintMode = "random" | "palette" | "byTexture";

export interface ParticleGeneratorDebugTintOptions {
    /**
     * How to apply debug tinting.
     * @defaultValue "random"
     */
    mode?: ParticleGeneratorDebugTintMode;
    /** A list of 0xRRGGBB colors used for "palette" or "byTexture" modes. */
    palette?: number[];
}

export interface ParticleGeneratorDebugOptions {
    /**
     * If true, fall back to {@link PIXI.Texture.WHITE} when no textures are configured.
     * @defaultValue false
     */
    useWhiteTexture?: boolean;
    /**
     * Optional automatic tinting for spawned particles.
     * @defaultValue null
     */
    tint?: ParticleGeneratorDebugTintOptions | boolean | null;
    /**
     * Whether to collect debug statistics.
     * @defaultValue false
     */
    stats?: boolean;
    /**
     * Whether to capture per-tick timings (requires stats).
     * @defaultValue false
     */
    profile?: boolean;
}

export interface ParticleGeneratorDebugStats {
    /** Current number of active particles. */
    active: number;
    /** Current number of pooled particles. */
    pool: number;
    /** Current adjusted target particle count. */
    target: number;
    /** Number of spawn attempts. */
    spawnAttempts: number;
    /** Number of successfully spawned particles. */
    spawned: number;
    /** Spawn attempts rejected by probability (auto-spawn only). */
    spawnRejectedProbability: number;
    /** Spawn attempts rejected by {@link ParticleGeneratorConfiguration#positionTest}. */
    spawnRejectedPositionTest: number;
    /** Spawn attempts rejected because no valid spawn area was available. */
    spawnRejectedNoArea: number;
    /** Particles recycled due to lifetime expiration. */
    recycledLifetime: number;
    /** Particles recycled due to constraint handling. */
    recycledConstraint: number;
    /** Particles recycled/cleared due to a hard stop. */
    recycledStop: number;
    /** Number of newly-visible rectangles this frame (ambient mode). */
    newlyVisibleAreaCount: number;
    /** Time spent updating particles during the most recent tick (milliseconds). */
    updateMS: number;
    /** Time spent auto-spawning particles during the most recent tick (milliseconds). */
    spawnMS: number;
    /** Total tick time for the most recent tick (milliseconds). */
    tickMS: number;
}

export interface ParticleGeneratorClipOptions {
    /**
     * Whether to apply a rectangular mask.
     * If null, defaults to true in ambient mode and false in effect mode.
     * @defaultValue null
     */
    enabled?: boolean | null;
    /**
     * Optional clip rectangle in scene coordinates. Defaults to the generator bounds.
     * @defaultValue null
     */
    rect?: PIXI.Rectangle | null;
}

export interface ParticleGeneratorConfiguration {
    /**
     * The runtime mode.
     * - "ambient": maintains a stable density in the visible region (viewport-based budget).
     * - "effect": spawns in a defined area; particles are lifetime-driven unless constrained.
     * @defaultValue "ambient"
     */
    mode?: ParticleGeneratorMode;
    /**
     * Optional generator bounds in scene coordinates.
     * This is used for coordinate conversion, viewport clamping, and optional clipping.
     * Defaults to the current Scene dimensions.
     * @defaultValue null
     */
    bounds?: PIXI.Rectangle | { x: number; y: number; width: number; height: number } | null;
    /**
     * The target particle count.
     * - In "ambient" mode, this is the maximum for the full bounds and is scaled by visible area.
     * - In "effect" mode, this is the absolute target.
     * @defaultValue 0
     */
    count?: number;
    /**
     * The maximum number of particles that may be spawned per frame (auto-spawn mode).
     * @defaultValue 5
     */
    perFrame?: number;
    /**
     * The initial proportion (0..1) of the computed target particle count to spawn on start.
     * @defaultValue 0.25
     */
    initial?: number;
    /**
     * If true, particles are never spawned automatically.
     * If null, defaults to true in "effect" mode and false in "ambient" mode.
     * @defaultValue null
     */
    manual?: boolean | null;
    /**
     * The chance (0..1) that a spawn attempt actually creates a particle.
     * @defaultValue 1
     */
    probability?: number;
    /**
     * A proportion (0..1+) of extra area around the visible region used for spawning.
     * For example, 0.2 extends the spawn region by 20% in each dimension.
     * @defaultValue 0
     */
    viewPadding?: number;
    /**
     * If true, prioritize spawning particles in newly-visible areas when the view changes (pan/zoom).
     * @defaultValue true
     */
    newlyVisible?: boolean;
    /**
     * If true, particles spawned in padded regions can start partially through their lifetime.
     * @defaultValue true
     */
    randomizeAgeInPadding?: boolean;
    /**
     * The default spawn area in "effect" mode (scene coordinates).
     * @defaultValue null
     */
    area?: ParticleGeneratorArea | null;
    /**
     * An optional spawn validator.
     * The function is invoked as (x, y, {generator, particle}) and must return true if the location is valid.
     * Coordinates are scene coordinates in pixels. The generator evaluates a single candidate position per spawn attempt.
     * @defaultValue null
     */
    positionTest?: ParticleGeneratorPositionTest | null;
    /**
     * How to handle particles leaving the constraint area.
     * If null, defaults to "kill" in ambient mode and "none" in effect mode.
     * @defaultValue null
     */
    constraintMode?: ParticleGeneratorConstraintMode | null;
    /**
     * The constraint area.
     * - "budget": the padded viewport rectangle.
     * - "view": the unpadded viewport rectangle.
     * - "world": the generator bounds.
     * - PIXI.Rectangle: a custom rectangle in scene coordinates.
     * If null, defaults to "budget" in ambient mode when constraintMode is not "none".
     * @defaultValue null
     */
    constraintArea?: "budget" | "view" | "world" | PIXI.Rectangle | null;
    /**
     * Bounce restitution factor (0..1) used when constraintMode is "bounce".
     * @defaultValue 1
     */
    restitution?: number;
    /** Clip (=> mask) configuration. Use true for default clipping (bounds) or pass a rectangle. */
    clip?: ParticleGeneratorClipOptions | PIXI.Rectangle | boolean;
    /**
     * An explicit mask for the particle container.
     * Accepts either a pre-built PIXI.DisplayObject or a PIXI shape which is drawn into a managed PIXI.Graphics.
     * Presence implies masking is desired, and this mask takes precedence over `clip`.
     * @defaultValue null
     */
    mask?: PIXI.DisplayObject | PIXI.IShape | null;
    /**
     * The particle lifetime in milliseconds.
     * @defaultValue 1000
     */
    lifetime?: ParticleGeneratorRange;
    /** Fade envelope configuration. */
    fade?: ParticleGeneratorFadeOptions;
    /**
     * The particle velocity in pixels per second.
     * @defaultValue null
     */
    velocity?: ParticleGeneratorVelocityOptions | null;
    /**
     * The rotation speed in degrees per second.
     * @defaultValue 0
     */
    rotationSpeed?: ParticleGeneratorRange;
    /** Optional random drift configuration. */
    drift?: { enabled: boolean; intensity: number };
    /**
     * The particle texture sources.
     * Each entry may be a PIXI.Texture or a string path usable by foundry.canvas.getTexture/PIXI.Texture.from.
     * @defaultValue []
     */
    textures?: (PIXI.Texture | string)[];
    /**
     * The blend mode used to render particles.
     * @defaultValue PIXI.BLEND_MODES.NORMAL
     */
    blend?: PIXI.BLEND_MODES;
    /**
     * An optional blur filter applied to the internal container.
     * @defaultValue null
     */
    blur?:
        | number
        | { intensity: number; quality?: number }
        | { enabled: boolean; intensity: number; quality?: number }
        | null;
    /**
     * The maximum alpha range for particles.
     * @defaultValue 1
     */
    alpha?: ParticleGeneratorRange;
    /**
     * The scale range for particles.
     * @defaultValue 1
     */
    scale?: ParticleGeneratorRange;
    /**
     * The elevation for the particle container.
     * @defaultValue 0
     */
    elevation?: number;
    /**
     * The sorting key for the particle container.
     * @defaultValue 0
     */
    sort?: number;
    /** The parent container which receives the internal particle container. Defaults to canvas.primary. */
    container?: PIXI.Container;
    /** The ticker used to drive the update loop. Defaults to {@link CanvasAnimation.ticker}. */
    ticker?: PIXI.Ticker;
    /**
     * An optional anchor used to attach areas and behaviors.
     * @defaultValue null
     */
    anchor?: ParticleGeneratorAnchor;
    /**
     * Which point to use when anchoring.
     * @defaultValue "center"
     */
    anchorPoint?: ParticleGeneratorAnchorPoint;
    /**
     * A fixed offset (scene pixels) applied to the anchor.
     * @defaultValue null
     */
    anchorOffset?: ParticleGeneratorPoint | null;
    /**
     * Optional behavior.
     * @defaultValue null
     */
    behavior?: ParticleGeneratorBehaviorId | ParticleGeneratorBehavior | null;
    /** Orbit behavior options. */
    orbit?: ParticleGeneratorOrbitOptions;
    /** Follow behavior options. */
    follow?: ParticleGeneratorFollowOptions;
    /**
     * An optional callback called after the particle has been placed and configured.
     * @defaultValue null
     */
    onSpawn?: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator }) => void) | null;
    /**
     * An optional callback called each frame for each live particle, after position, rotation, and alpha have been computed.
     * @defaultValue null
     */
    onUpdate?: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator }) => void) | null;
    /**
     * An optional callback called when a particle is recycled.
     * @defaultValue null
     */
    onDeath?: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator; reason: string }) => void) | null;
    /**
     * An optional callback called per frame (not per particle!).
     * @defaultValue null
     */
    onTick?: ((dt: number, generator: ParticleGenerator) => void) | null;
    /**
     * Optional debugging helpers.
     * @defaultValue null
     */
    debug?: ParticleGeneratorDebugOptions | boolean | null;
}

export type ParticleMesh = SpriteMesh & {
    elapsedTime: number;
    lifetime: number;
    fadeInDuration: number;
    fadeOutDuration: number;
    maxAlpha: number;
    rotationSpeed: number;
    movementSpeed: PIXI.Point;
};

type ParticleGeneratorPositionTest = (
    x: number,
    y: number,
    data: { generator: ParticleGenerator; particle: ParticleMesh },
) => boolean;

/**
 * A lightweight, native particle generator designed for VFX.
 *
 * ParticleGenerator manages:
 * - An internal container on the chosen canvas layer (usually `canvas.primary`)
 * - Particle pooling (reusing sprites instead of constantly allocating new ones)
 * - Lifetime, fade-in/out, basic motion, and optional constraints
 * - Two usage styles:
 *   - **ambient**: keep a steady density in the visible area (viewport-driven budget)
 *   - **effect**: spawn particles in a specific area (manual spawns or a fixed target count)
 *
 * The API is intentionally compact:
 * - Put most settings at the top level (`textures`, `blend`, `alpha`, `scale`, `count`, `lifetime`, etc.)
 * - Use `area` to define where particles spawn
 * - Use `spawnParticle()` or `spawnParticles()` to spawn particles (optionally overriding texture/area/position)
 * - Use `start({spawn: n})` when you want to immediately seed a certain number of particles on start
 * - Use `onSpawn` to customize each particle after it has been positioned and configured
 * - Use `onUpdate` to apply per-particle per-frame logic after position, rotation, and alpha are computed
 * - Use `onDeath` to react when particles are recycled (optional)
 *
 * ## Core concepts
 *
 * ### Mode
 * - `mode: "ambient"` maintains a stable density in the visible region.
 *   `count` is scaled by the visible area ratio, and spawning uses the padded viewport (`viewPadding`).
 * - `mode: "effect"` spawns in a defined `area`. `count` is treated as an absolute target.
 *    You can use `manual: true` and spawn at your own rate via `spawnParticle()` / `spawnParticles()`.
 *
 * ### Fade
 * `fade.in` / `fade.out` accept:
 * - milliseconds when value >= 1
 * - a fraction of the particle lifetime when 0 < value < 1
 *
 * ### Velocity
 * `velocity` can be:
 * - fixed: `{x, y}` or `new PIXI.Point(x, y)`
 * - ranged: `{x: [min, max], y: [min, max]}`
 * - polar: `{speed: [min, max], angle: [min, max]}` (angle in degrees)
 *
 * ### Area
 * `area` supports:
 * - Point: `{x, y}`
 * - Rect: `{x, y, width, height}` or `new PIXI.Rectangle(x, y, w, h)`
 * - Circle: `{x, y, radius}`
 * - Ring: `{x, y, innerRadius, outerRadius}` or `{x, y, radius: [inner, outer]}`
 * - Line: `{from: {x, y}, to: {x, y}}`
 *
 * If you provide an `anchor`, object-based areas can be treated as offsets relative to that anchor.
 * To force an absolute rectangle while anchored, pass a `PIXI.Rectangle`.
 *
 * ## Performance tips
 * - Preload textures before creating the generator.
 * - Prefer calling `spawnParticle()` or `spawnParticles()` with no options when you can. It avoids per-spawn object allocations.
 * - Keep `positionTest` cheap. It runs in a hot path.
 * - Avoid blur unless you really need it (pre-blurred textures are better).
 *
 * ## Practical limits
 * ParticleGenerator is meant for local, short-lived effects (bursts, embers, motes, small auras),
 * not for filling the entire scene with massive particle counts. If you push it into many thousands of active particles,
 * performance could degrade quickly. In practice, you’ll get better results by using moderate counts, short lifetimes,
 * and small spawn areas, and by stopping the effect when it’s no longer needed.
 *
 * Texture size also matters. Large particle textures (or heavy blur) increase pixel work,
 * especially with additive/screen blends and overdraw, which can become fill-rate bound on some GPUs.
 * Prefer small textures (and sprite sheets!), keep particle sizes reasonable on screen, and avoid expensive full-screen
 * coverage when you only need a local effect.
 *
 * ## Examples
 *
 * @example
 * ### 1) Ambient dust (steady density in view)
 * Use this for soft, always-on atmospheric particles.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "ambient",
 *   textures: [
 *     "worlds/shared_assets/particles/dust1.png",
 *     "worlds/shared_assets/particles/dust2.png"
 *   ],
 *   blend: PIXI.BLEND_MODES.NORMAL,
 *   count: 300,
 *   viewPadding: 0.25,
 *   lifetime: [1200, 2200],
 *   fade: {in: 0.15, out: 0.25},
 *   velocity: {x: [-5, 5], y: [-10, -30]},
 *   alpha: [0.08, 0.18],
 *   scale: [0.35, 0.85]
 * });
 * gen.start();
 * ```
 *
 * ### 2) Ambient snow (padding + random age)
 * Great for snowfall that looks continuous when you pan the camera.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "ambient",
 *   textures: ["worlds/shared_assets/particles/snow.png"],
 *   count: 400,
 *   viewPadding: 0.3,
 *   randomizeAgeInPadding: true,
 *   lifetime: [2500, 4500],
 *   fade: {in: 0.2, out: 0.2},
 *   velocity: {x: [-8, 8], y: [-25, -55]},
 *   alpha: [0.12, 0.25],
 *   scale: [0.3, 0.9],
 *   blend: PIXI.BLEND_MODES.SCREEN
 * });
 * gen.start();
 * ```
 *
 * ### 3) Manual burst at a point (effect mode)
 * Use this for clicks, impacts, or quick one-shot effects.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: true,
 *   textures: ["worlds/shared_assets/particles/dust1.png"],
 *   lifetime: [450, 900],
 *   fade: {in: 0.05, out: 0.4},
 *   velocity: {speed: [80, 200], angle: [0, 360]},
 *   alpha: [0.4, 0.8],
 *   scale: [0.3, 0.8]
 * });
 * gen.start();
 *
 * // Spawn a burst at {x,y}
 * const p = {x: 1000, y: 800};
 * gen.spawnParticles(120, {position: p});
 * ```
 *
 * ### 4) Manual spawn rate (embers around a token)
 * Use this to continuously spawn particles around something.
 * ```js
 * const token = canvas.tokens.controlled[0];
 * let acc = 0;
 * const area = {radius: 70}; // relative to anchor, no x/y needed
 *
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: true,
 *   anchor: token,
 *   anchorPoint: "center",
 *   area,
 *   elevation: token.document.elevation ?? 0,
 *   textures: [
 *     "worlds/shared_assets/particles/dust1.png",
 *     "worlds/shared_assets/particles/dust2.png",
 *     "worlds/shared_assets/particles/dust3.png",
 *     "worlds/shared_assets/particles/dust4.png"
 *   ],
 *   lifetime: [450, 900],
 *   fade: {in: 0.05, out: 0.4},
 *   velocity: {x: [-160, 160], y: [-160, 160]},
 *   rotationSpeed: 180,
 *   alpha: [0.5, 0.75],
 *   scale: [0.25, 0.75],
 *   blend: PIXI.BLEND_MODES.NORMAL,
 *   onTick: (dt, generator) => {
 *     const RATE = 90; // particles/sec
 *     acc += (dt * RATE) / 1000;
 *     const n = acc | 0;
 *     acc -= n;
 *     if ( n > 0 ) generator.spawnParticles(n, {area});
 *   }
 * });
 * gen.start();
 * ```
 *
 * ### 5) Ring spawn + radial outward motion (use onSpawn)
 * Good for shockwaves, sparks, or “pushing out” energy.
 * ```js
 * const center = {x: 1200, y: 900};
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: true,
 *   textures: ["worlds/shared_assets/particles/spark.png"],
 *   area: {x: center.x, y: center.y, radius: [80, 120]},
 *   lifetime: [500, 900],
 *   fade: {in: 0.1, out: 0.3},
 *   alpha: [0.4, 0.9],
 *   scale: [0.3, 0.7],
 *   onSpawn: (p) => {
 *     const cx = center.x - gen._bounds.x;
 *     const cy = center.y - gen._bounds.y;
 *
 *     let dx = p.x - cx;
 *     let dy = p.y - cy;
 *
 *     const d = Math.hypot(dx, dy) || 1;
 *     dx /= d;
 *     dy /= d;
 *
 *     const speed = Math.mix(120, 240, Math.random());
 *     p.movementSpeed.x = dx * speed;
 *     p.movementSpeed.y = dy * speed;
 *   }
 * });
 * gen.start({spawn: 120});
 * ```
 *
 * ### 6) Keep particles inside a rectangle (wrap)
 * Use this for localized ambient effects in a region.
 * ```js
 * const zone = new PIXI.Rectangle(900, 700, 600, 400);
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: false,
 *   count: 250,
 *   area: zone,
 *   constraintMode: "wrap",
 *   constraintArea: zone,
 *   textures: ["worlds/shared_assets/particles/dust1.png"],
 *   lifetime: [1200, 2200],
 *   fade: {in: 0.2, out: 0.2},
 *   velocity: {x: [-20, 20], y: [-10, 10]},
 *   alpha: [0.1, 0.25],
 *   scale: [0.4, 0.9]
 * });
 * gen.start({spawn: 250});
 * ```
 *
 * ### 7) Bounce inside bounds (arcade-style)
 * Great for “energy balls” in a box or magic motes in a bounded area.
 * ```js
 * const zone = new PIXI.Rectangle(900, 700, 600, 400);
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: false,
 *   count: 80,
 *   area: zone,
 *   constraintMode: "bounce",
 *   constraintArea: zone,
 *   restitution: 0.9,
 *   textures: ["worlds/shared_assets/particles/mote.png"],
 *   lifetime: [2000, 4000],
 *   fade: {in: 0.15, out: 0.25},
 *   velocity: {x: [-120, 120], y: [-120, 120]},
 *   alpha: [0.25, 0.6],
 *   scale: [0.5, 1.0],
 *   blend: PIXI.BLEND_MODES.SCREEN
 * });
 * gen.start({spawn: 80});
 * ```
 *
 * ### 8) Use a clip mask (hard visual boundary)
 * Use this when you need a strict rectangle cutout.
 * ```js
 * const clipRect = new PIXI.Rectangle(900, 700, 600, 400);
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: false,
 *   count: 300,
 *   area: clipRect,
 *   clip: clipRect,
 *   textures: ["worlds/shared_assets/particles/fog.png"],
 *   lifetime: [2000, 4000],
 *   fade: {in: 0.2, out: 0.2},
 *   velocity: {x: [-10, 10], y: [-10, 10]},
 *   alpha: [0.08, 0.18],
 *   scale: [0.8, 1.6],
 *   blend: PIXI.BLEND_MODES.SCREEN
 * });
 * gen.start({spawn: 300});
 * ```
 *
 * ### 9) Multiple textures + additive blend (magic motes)
 * Use this for “sparkly” looks with layered variation.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: false,
 *   count: 150,
 *   area: {x: 1200, y: 900, radius: 250},
 *   textures: ["mote1.png", "mote2.png", "mote3.png"],
 *   blend: PIXI.BLEND_MODES.SCREEN,
 *   lifetime: [1500, 2600],
 *   fade: {in: 0.2, out: 0.35},
 *   velocity: {speed: [5, 20], angle: [0, 360]},
 *   rotationSpeed: 45,
 *   alpha: [0.15, 0.45],
 *   scale: [0.3, 0.8]
 * });
 * gen.start({spawn: 150});
 * ```
 *
 * ### 10) Force a specific texture per spawn
 * Useful when you want a rare “special” particle occasionally.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: true,
 *   textures: ["a.png", "b.png"]
 * });
 * gen.start();
 * gen.spawnParticle({texture: "special.png", position: {x: 1200, y: 900}});
 * ```
 *
 * ### 11) Spawn into a temporary override area
 * Use this to reuse one generator for multiple nearby spawns without rebuilding it.
 * ```js
 * const gen = new foundry.canvas.animation.ParticleGenerator({
 *   mode: "effect",
 *   manual: true,
 *   textures: ["dust1.png"],
 *   lifetime: [500, 900]
 * });
 *
 * // Start the generator
 * gen.start();
 *
 * const r1 = new PIXI.Rectangle(900, 700, 200, 200);
 * const r2 = new PIXI.Rectangle(1200, 700, 200, 200);
 * gen.spawnParticles(50, {area: r1});
 * gen.spawnParticles(50, {area: r2});
 *
 * // Stop the generator (soft stop by default)
 * gen.stop()
 * ```
 */
export default class ParticleGenerator {
    constructor(config?: ParticleGeneratorConfiguration);

    /* -------------------------------------------- */
    /*  Static Defaults                             */
    /* -------------------------------------------- */

    /** Default generator config. */
    static DEFAULT_OPTIONS: ParticleGeneratorConfiguration;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** The runtime mode. */
    mode: ParticleGeneratorMode;

    /** The parent container which receives the internal particle container. */
    container: PIXI.Container;

    /** An optional anchor used to attach areas and behaviors. */
    anchor: ParticleGeneratorAnchor;

    /** Which point to use when anchoring. */
    anchorPoint: ParticleGeneratorAnchorPoint;

    /** A fixed offset (scene pixels) applied to the anchor. */
    anchorOffset: { x: number; y: number } | null;

    /** The configured particle textures. */
    textures: PIXI.Texture[];

    /** Viewport-related behavior (used primarily in ambient mode). */
    viewport: { padding: number; newlyVisible: boolean; randomizeAgeInPadding: boolean };

    /** The target particle count. */
    maxParticles: number;

    /** The maximum number of particles that may be spawned per frame (auto-spawn mode). */
    maxParticlesPerFrame: number;

    /** The initial proportion (0..1) of the computed target particle count to spawn on start. */
    initialBatch: number;

    /** If true, particles are never spawned automatically. */
    manualSpawning: boolean;

    /** The chance (0..1) that a spawn attempt actually creates a particle. */
    spawnProbability: number;

    /** An optional spawn validator. */
    positionTest: ParticleGeneratorPositionTest | null;

    /** Out-of-bounds constraint configuration. */
    constraints: {
        mode: ParticleGeneratorConstraintMode;
        area: "budget" | "view" | "world" | PIXI.Rectangle | null;
        restitution: number;
    };

    /** Clip (mask) options for the default bounds-rectangle clipping behavior. */
    clip: { enabled: boolean | null; rect: PIXI.Rectangle | null };

    /** The particle lifetime configuration in milliseconds. */
    particleLifetime: ParticleGeneratorRange;

    /** The fade-in duration in milliseconds, or a fraction of lifetime if 0 < value < 1. */
    fadeInDuration: number;

    /** The fade-out duration in milliseconds, or a fraction of lifetime if 0 < value < 1. */
    fadeOutDuration: number;

    /** The blend mode used to render particles. */
    blendMode: PIXI.BLEND_MODES;

    /** The rotation speed range of particles in radians per second. */
    rotationSpeed: { min: number; max: number };

    /** The velocity configuration used to generate per-particle movement. */
    velocity: ParticleGeneratorVelocityOptions | null;

    /** Optional random drift configuration. */
    drift: { enabled: boolean; intensity: number };

    /** Optional blur filter options applied to the internal container. */
    blurOptions: { enabled: boolean; intensity: number; quality?: number } | null;

    /** The maximum alpha range for particles. */
    alphaRange: { min: number; max: number };

    /** The scale range for particles. */
    scaleRange: { min: number; max: number };

    /** The elevation for the particle container. */
    elevation: number;

    /** The sorting key for the particle container. */
    sort: number;

    /** Orbit behavior options. */
    orbit: ParticleGeneratorOrbitOptions;

    /** Follow behavior options. */
    follow: ParticleGeneratorFollowOptions;

    /** An optional callback called after the particle has been placed and configured. */
    onSpawn: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator }) => void) | null;

    /** An optional callback called each frame for each live particle. */
    onUpdate: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator }) => void) | null;

    /** An optional callback called when a particle is recycled. */
    onDeath: ((particle: ParticleMesh, ctx: { generator: ParticleGenerator; reason: string }) => void) | null;

    /** An optional callback called one time per frame (not per particle!). */
    onTick: ((dt: number, generator: ParticleGenerator) => void) | null;

    /** The computed target particle count based on visible area (ambient mode) or the configured budget (effect mode). */
    adjustedMaxParticles: number;

    /** The currently active particle instances. */
    particles: ParticleMesh[];

    /** A pool of recycled particles ready to be reused. */
    particlePool: ParticleMesh[];

    /* -------------------------------------------- */
    /*  Internal State                              */
    /* -------------------------------------------- */

    /** Generator bounds in scene coordinates. */
    protected _bounds: PIXI.Rectangle;

    /**
     * The configured default spawn area (effect mode).
     * This area is defined in scene coordinates and may be interpreted relative to an anchor.
     */
    protected _spawnArea: ParticleGeneratorArea | null;

    /** Optional custom constraint rectangle in local coordinates. */
    protected _constraintRect: PIXI.Rectangle | null;

    /** Whether the generator is soft-stopped. */
    protected _stopped: boolean;

    /** Whether the update callback is attached to the ticker. */
    protected _tickerAttached: boolean;

    /** Whether the generator has spawned its initial batch. */
    protected _initialized: boolean;

    /** The internal container which holds all particles. */
    protected _particlesContainer: PrimaryCanvasParticleContainer | null;

    /** The display object used to mask particle rendering. */
    protected _mask: PIXI.DisplayObject | null;

    /** The blur filter applied to the internal container, if any. */
    protected _blurFilter: PIXI.Filter | null;

    /** The local-space viewport rectangle without padding. */
    protected _viewRectLocal: PIXI.Rectangle;

    /** The local-space viewport rectangle with padding. */
    protected _budgetRectLocal: PIXI.Rectangle;

    /** The local-space generator bounds. */
    protected _worldRectLocal: PIXI.Rectangle;

    /** The previous-frame budget rectangle. */
    protected _oldBudgetRectLocal: PIXI.Rectangle;

    /** Whether the previous-frame budget rectangle is initialized. */
    protected _hasOldBudgetRectLocal: boolean;

    /** A fixed pool of rectangles used to describe newly visible areas. */
    protected _newlyVisibleAreaPool: [PIXI.Rectangle, PIXI.Rectangle, PIXI.Rectangle, PIXI.Rectangle];

    /** The list of newly visible areas for the current frame in local coordinates. */
    protected _newlyVisibleAreas: PIXI.Rectangle[];

    /** The current anchor position in scene coordinates. */
    protected _anchorScene: PIXI.Point;

    /** The current anchor position in local coordinates. */
    protected _anchorLocal: PIXI.Point;

    /** The active behavior implementation. */
    protected _behavior: ParticleGeneratorBehavior | null;

    /** A cached context object passed to behavior hooks. */
    protected _behaviorContext: object;

    /** Temp point used to avoid per-frame allocations. */
    protected _tlScreen: PIXI.Point;

    /** Temp point used to avoid per-frame allocations. */
    protected _brScreen: PIXI.Point;

    /** Temp point used to avoid per-frame allocations. */
    protected _tlLocal: PIXI.Point;

    /** Temp point used to avoid per-frame allocations. */
    protected _brLocal: PIXI.Point;

    /** A function which generates per-particle movement speed vectors. */
    protected _generateMovementSpeed: (out: PIXI.Point) => void;

    /** Normalized debug options. */
    protected _debug: ParticleGeneratorDebugOptions | null;

    /**
     * Debug statistics and profiling output.
     * Null when debug stats are disabled.
     */
    protected _debugStats: ParticleGeneratorDebugStats | null;

    /** Whether profiling is enabled. */
    protected _debugProfile: boolean;

    /** Cached debug tint options. */
    protected _debugTint: { mode: ParticleGeneratorDebugTintMode; palette: number[] } | null;

    /** A mapping from textures to deterministic tint values. */
    protected _debugTintByTexture: WeakMap<PIXI.Texture, number> | null;

    /* -------------------------------------------- */
    /*  Public Getters                              */
    /* -------------------------------------------- */

    /** The current unpadded viewport rectangle in the generator's local space. */
    get viewRectLocal(): PIXI.Rectangle;

    /** The current padded viewport rectangle used for budget/spawning in ambient mode. */
    get budgetRectLocal(): PIXI.Rectangle;

    /**
     * The mask applied to the particle container. Set to null to remove the mask.
     * The generator does not manage the lifecycle of externally assigned masks.
     */
    get mask(): PIXI.DisplayObject | null;
    set mask(value: PIXI.DisplayObject | null);

    /**
     * Debug statistics and profiling output.
     * Returns null if {@link ParticleGeneratorDebugOptions#stats} is not enabled.
     *
     * Note: This getter returns a stable object reference and updates the live values (active/pool/target)
     * on access.
     */
    get debugStats(): ParticleGeneratorDebugStats | null;

    /* -------------------------------------------- */
    /*  Public Methods                              */
    /* -------------------------------------------- */

    /**
     * Start the generator, create the update loop and optionally spawn an initial batch.
     * @param options
     * @param options.spawn Spawn this many particles immediately after starting.
     *                      If {@link ParticleGenerator#manualSpawning} is false, this is capped
     *                      to the remaining budget (target - active).
     */
    start(options?: { spawn?: number }): void;

    /**
     * Stop the generator.
     * @param options
     * @param options.hard If true, detach the update loop and destroy internal resources.
     *                     If false, stop spawning and let existing particles expire naturally.
     */
    stop(options?: { hard?: boolean }): void;

    /**
     * Spawn a single particle.
     * In "ambient" mode, the default spawn area is the current padded viewport rectangle.
     * In "effect" mode, the default spawn area is the configured {@link ParticleGeneratorArea}.
     * @param options
     * @param options.texture A texture (or texture source string) to force for this particle.
     * @param options.area An optional spawn area override.
     *        Interpreted the same as the configured area (scene coordinates, or relative-to-anchor when anchored).
     * @param options.position An optional explicit spawn position (scene coordinates).
     */
    spawnParticle(options?: {
        texture?: PIXI.Texture | string;
        area?: ParticleGeneratorArea | PIXI.Rectangle | null;
        position?: PIXI.Point | { x: number; y: number } | null;
    }): ParticleMesh | null;

    /**
     * Spawn multiple particles.
     * @param count The number of particles to spawn.
     * @param options
     * @param options.texture A texture (or texture source string) to force for this burst.
     * @param options.area An optional spawn area override.
     *        Interpreted the same as the configured area (scene coordinates, or relative-to-anchor when anchored).
     * @param options.position An optional explicit spawn position (scene coordinates).
     * @returns The number of successfully spawned particles.
     */
    spawnParticles(
        count: number,
        options?: {
            texture?: PIXI.Texture | string;
            area?: ParticleGeneratorArea | PIXI.Rectangle | null;
            position?: ParticleGeneratorPoint | null;
        },
    ): number;

    /* -------------------------------------------- */
    /*  Configuration                               */
    /* -------------------------------------------- */

    /**
     * Apply the configuration to the ParticleGenerator instance.
     * @param cfg The configuration object.
     */
    protected _configureOptions(cfg: ParticleGeneratorConfiguration): void;

    /**
     * Configure optional debug helpers.
     * This feature set is fully opt-in and is designed to have near-zero overhead when disabled.
     * @param debug
     */
    protected _configureDebug(debug: ParticleGeneratorDebugOptions | boolean | null | undefined): void;

    /**
     * Initialize behaviors from the configuration object.
     * @param cfg
     */
    protected _initializeBehaviors(cfg: ParticleGeneratorConfiguration): void;

    /**
     * Initialize cached generators from the configuration object.
     * @param cfg
     */
    protected _initializeCachedGenerators(cfg: ParticleGeneratorConfiguration): void;

    /* -------------------------------------------- */
    /*  Update Loop                                 */
    /* -------------------------------------------- */

    /**
     * Compute the current viewport rectangles and target particle count.
     * All rectangles are in the local coordinate space of the internal container.
     */
    protected _calculateGeneratorProperties(): void;

    /**
     * Compute the portions of newRect that were not visible in oldRect.
     * This method reuses a fixed pool of rectangles to avoid per-frame allocations.
     * @param oldRect
     * @param newRect
     */
    protected _computeNewlyVisibleAreas(oldRect: PIXI.Rectangle, newRect: PIXI.Rectangle): void;

    /** Spawn the initial batch with randomized elapsed times so the scene appears pre-settled. */
    protected _initializeParticles(): void;

    /** Ticker callback. */
    protected _onTick(): void;

    /**
     * Update all active particles.
     * @param dt Delta time in milliseconds.
     */
    protected _updateExistingParticles(dt: number): void;

    /**
     * Update particles without constraints.
     * @param dt Delta time in milliseconds.
     * @param ds Delta time in seconds.
     * @param particles
     * @param behavior
     * @param bctx
     */
    protected _updateParticlesUnconstrained(
        dt: number,
        ds: number,
        particles: ParticleMesh[],
        behavior: ParticleGeneratorBehavior | null,
        bctx: object | null,
    ): void;

    /**
     * Update particles with constraints applied.
     * @param dt Delta time in milliseconds.
     * @param ds Delta time in seconds.
     * @param bounds
     * @param particles
     * @param behavior
     * @param bctx
     * @param mode
     */
    protected _updateParticlesConstrained(
        dt: number,
        ds: number,
        bounds: PIXI.Rectangle,
        particles: ParticleMesh[],
        behavior: ParticleGeneratorBehavior | null,
        bctx: object | null,
        mode: ParticleGeneratorConstraintMode,
    ): void;

    /** Spawn particles to move toward the current target count. */
    protected _autoSpawnParticles(): void;

    /* -------------------------------------------- */
    /*  Particle Internals                          */
    /* -------------------------------------------- */

    /**
     * Apply a random drift vector to a particle.
     * @param particle
     */
    protected _applyRandomDrift(particle: ParticleMesh): void;

    /**
     * Create a new particle instance.
     * @param texture
     */
    protected _createNewParticle(texture: PIXI.Texture): ParticleMesh;

    /**
     * Initialize/refresh base particle properties.
     * @param particle
     */
    protected _setupParticleBase(particle: ParticleMesh): void;

    /**
     * Recycle a particle to the pool.
     * @param particle
     * @param reason
     */
    protected _recycleParticle(particle: ParticleMesh, reason: string): void;

    /* -------------------------------------------- */
    /*  Texture Helpers                             */
    /* -------------------------------------------- */

    /** Get a random texture from the configured set. */
    protected _getRandomTexture(): PIXI.Texture | null;

    /** Get default bounds from the current scene dimensions. */
    protected _getDefaultBounds(): PIXI.Rectangle;
}
