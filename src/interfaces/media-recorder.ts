import { TBlobEventHandler, TErrorEventHandler, TEventHandler, TRecordingState } from '../types';
import { IEventTarget } from './event-target';
import { IMediaRecorderEventMap } from './media-recorder-event-map';

// @todo TypeScript does not include type definitions for the MediaStream Recording specification yet.
export interface IMediaRecorder extends IEventTarget<IMediaRecorderEventMap> {
    readonly mimeType: string;

    ondataavailable: null | TBlobEventHandler<this>;

    onerror: null | TErrorEventHandler<this>;

    onstop: null | TEventHandler<this>;

    readonly state: TRecordingState;

    start(timeslice?: number): void;

    stop(): void;
}
