import { SimplePeer } from "simple-peer";
import AVClient from "../client.mjs";

/**
 * An implementation of the AVClient which uses the simple-peer library and the Foundry socket server for signaling.
 * Credit to bekit#4213 for identifying simple-peer as a viable technology and providing a POC implementation.
 * @extends {AVClient}
 */
export default class SimplePeerAVClient extends AVClient {
    /**
     * The local Stream which captures input video and audio
     */
    localStream: MediaStream | null;

    /**
     * The dedicated audio stream used to measure volume levels for voice activity detection.
     */
    levelsStream: MediaStream | null;

    /**
     * A mapping of connected peers
     */
    peers: Map<string, SimplePeer>;

    /**
     * A mapping of connected remote streams
     */
    remoteStreams: Map<string, MediaStream>;

    /**
     * Is outbound broadcast of local audio enabled?
     */
    audioBroadcastEnabled: boolean;

    /* -------------------------------------------- */
    /*  Required AVClient Methods                   */
    /* -------------------------------------------- */

    override connect(): Promise<true>;

    override disconnect(): Promise<true>;

    override initialize(): Promise<void>;

    override getConnectedUsers(): string[];

    override getMediaStreamForUser(userId: string): MediaStream | null | undefined;

    override getLevelsStreamForUser(userId: string): MediaStream | null | undefined;

    override isAudioEnabled(): boolean;

    override isVideoEnabled(): boolean;

    override toggleAudio(enabled: boolean): void;

    override toggleBroadcast(enabled: boolean): void;

    override toggleVideo(enabled: boolean): void;

    override setUserVideo(userId: string, videoElement: HTMLVideoElement): Promise<void>;

    /* -------------------------------------------- */
    /*  Local Stream Management                     */
    /* -------------------------------------------- */

    /**
     * Initialize a local media stream for the current user
     */
    initializeLocalStream(): Promise<MediaStream>;

    /* -------------------------------------------- */
    /*  Peer Stream Management                      */
    /* -------------------------------------------- */

    /**
     * Listen for Audio/Video updates on the av socket to broker connections between peers
     */
    activateSocketListeners(): void;

    /**
     * Initialize a stream connection with a new peer
     * @param userId The Foundry user ID for which the peer stream should be established
     * @returns A Promise which resolves once the peer stream is initialized
     */
    initializePeerStream(userId: string): Promise<SimplePeer>;

    /**
     * Receive a request to establish a peer signal with some other User id
     * @param userId The Foundry user ID who is requesting to establish a connection
     * @param data The connection details provided by SimplePeer
     */
    receiveSignal(userId: string, data: object): void;

    /**
     * Connect to a peer directly, either as the initiator or as the receiver
     * @param userId The Foundry user ID with whom we are connecting
     * @param isInitiator Is the current user initiating the connection, or responding to it?
     * @returns The constructed and configured SimplePeer instance
     */
    connectPeer(userId: string, isInitiator?: boolean): SimplePeer;

    /**
     * Disconnect from a peer by stopping current stream tracks and destroying the SimplePeer instance
     * @param {string} userId           The Foundry user ID from whom we are disconnecting
     * @returns {Promise<void>}         A Promise which resolves once the disconnection is complete
     */
    disconnectPeer(userId: string): Promise<void>;

    /**
     * Disconnect from all current peer streams
     * @returns A Promise which resolves once all peers have been disconnected
     */
    disconnectAll(): Promise<unknown[]>;

    /* -------------------------------------------- */
    /*  Settings and Configuration                  */
    /* -------------------------------------------- */

    override onSettingsChanged(changed: object): Promise<void>;

    override updateLocalStream(): Promise<void>;
}
