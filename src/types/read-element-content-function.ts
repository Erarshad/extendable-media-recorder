import { TElementType } from './element-type';

export type TReadElementContentFunction = (
    dataView: Pick<DataView, 'byteLength' | 'byteOffset' | 'getFloat32' | 'getUint8'>,
    offset: number,
    type: TElementType
) => null | { content: null | readonly [ Float32Array, Float32Array ]; length: number };
