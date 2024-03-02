/**
 * Uploading large files with chunking using server action in Next.js
 */

export type Primitive = string | boolean | number | undefined | null;

export type Metadata = Record<string, Primitive> | Primitive;

export interface ChunkFormData {
  get(name: 'blob'): Blob;
  get(name: 'offset'): `${number}`;
  get(name: 'length'): `${number}`;
  get(name: 'retry'): `${number}`;
  get(name: 'total'): `${number}`;
  get(name: 'isLastChunk'): 'true' | 'false';
}

export type ChunkUploadHandler<TMetadata extends Metadata = Metadata> = (
  chunkFormData: ChunkFormData,
  metadata: TMetadata
) => Promise<void>;

export interface ChunkUploaderOptions<TMetadata extends Metadata> {
  file: File;
  /**
   * The function that define how the chunk is uploaded to the server.
   */
  onChunkUpload: ChunkUploadHandler<TMetadata>;
  /**
   * The metadata to send with each chunk.
   * This can be used to send additional information like the file name, file type, etc.
   */
  metadata: TMetadata;
  /**
   * The number of bytes to send in each chunk.
   *
   * Default: `5MB` (5 * 1024 * 1024)
   */
  chunkBytes?: number;
  /**
   * Milliseconds to wait before retrying a failed chunk upload.
   * Set to an empty array to disable retries.
   *
   * Default: `[1000, 2000, 4000, 8000]`
   */
  retryDelays?: number[];
  /**
   * A callback that is called when a chunk is uploaded.
   */
  onChunkComplete?: (bytesAccepted: number, bytesTotal: number) => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  onPaused?: () => void;
  onAborted?: () => void;
  onStatusChange?: (
    oldStatus: ChunkUploaderStatus | undefined,
    newStatus: ChunkUploaderStatus
  ) => void;
}

export type ChunkUploaderStatus =
  | 'pending'
  | 'uploading'
  | 'pausing'
  | 'paused'
  | 'aborted'
  | 'complete'
  | 'error';

export class ChunkUploader<TMetadata extends Metadata> {
  constructor(options: ChunkUploaderOptions<TMetadata>) {
    this._validateOptions(options);

    this._status = 'pending';
    this._position = 0;
    this._isUploadingLastChunk = false;

    this._file = options.file;
    this._onChunkUpload = options.onChunkUpload;
    this._chunkBytes = options.chunkBytes || 1024 * 1024 * 5;
    this._metadata = options.metadata;
    this._retryDelays = options.retryDelays || [1000, 2000, 4000, 8000];
    this._onChunkComplete = options.onChunkComplete;
    this._onSuccess = options.onSuccess;
    this._onError = options.onError;
    this._onPaused = options.onPaused;
    this._onAborted = options.onAborted;
    this._onStatusChange = options.onStatusChange;

    if (this._onStatusChange) this._onStatusChange(undefined, this.status);
  }

  /*************
   * Public
   *************/
  public get status() {
    return this._status;
  }

  public get bytesUploaded() {
    return this._position;
  }

  public get error() {
    return this._error;
  }

  /**
   * Start the upload process.
   * returns `false` if the status is not `pending`.
   *
   * status: `pending` -> `uploading` -> `complete` or `error`
   */
  public start() {
    if (this.status !== 'pending') return false;
    this.status = 'uploading';
    this._error = undefined;
    this._startUploadFromCurrentPosition().catch(() => {});
    return true;
  }

  /**
   * Pause the upload process.
   * returns `false` if the status is not `uploading` or the last chunk is being uploaded.
   *
   * status: `uploading` -> `pausing` -> `paused`
   */
  public pause() {
    if (this.status !== 'uploading' || this._isUploadingLastChunk) return false;
    this.status = 'pausing';
    return true;
  }

  /**
   * Resume the upload process.
   * returns `false` if the status is not `paused` or `error`.
   *
   * status: `paused` or `error` -> `uploading` -> `complete` or `error`
   */
  public resume() {
    if (this.status !== 'paused' && this.status !== 'error') return false;
    this.status = 'uploading';
    this._error = undefined;
    this._startUploadFromCurrentPosition().catch(() => {});
    return true;
  }

  /**
   * Abort the upload process.
   * returns `false` if the status is not `paused`.
   *
   * status: `paused` -> `aborted`
   */
  public abort() {
    if (this.status !== 'paused') return false;
    this.status = 'aborted';
    if (this._onAborted) this._onAborted();
    return true;
  }

  /*************
   * Protected
   *************/
  protected _status: ChunkUploaderStatus;
  protected set status(value: ChunkUploaderStatus) {
    const oldValue = this._status;
    if (oldValue === value) return;
    this._status = value;
    if (this._onStatusChange) this._onStatusChange(oldValue, value);
  }
  protected _position: number;
  protected _isUploadingLastChunk: boolean;
  protected _error?: unknown;

  protected readonly _file: File;
  protected readonly _onChunkUpload: ChunkUploadHandler<TMetadata>;
  protected readonly _chunkBytes: number;
  protected readonly _metadata: Readonly<TMetadata>;
  protected readonly _retryDelays: readonly number[];

  protected readonly _onChunkComplete?: (bytesAccepted: number, bytesTotal: number) => void;
  protected readonly _onSuccess?: () => void;
  protected readonly _onError?: (error: unknown) => void;
  protected readonly _onPaused?: () => void;
  protected readonly _onAborted?: () => void;
  protected readonly _onStatusChange?: (
    oldStatus: ChunkUploaderStatus | undefined,
    newStatus: ChunkUploaderStatus
  ) => void;

  protected async _startUploadFromCurrentPosition() {
    let isLastChunkUploaded = false;
    while (!isLastChunkUploaded) {
      isLastChunkUploaded = await this._uploadNextChunk();
      if (this.status === 'pausing') {
        this.status = 'paused';
        if (this._onPaused) this._onPaused();
        return;
      }
    }
  }

  protected async _uploadNextChunk() {
    const isLastChunk = this._position + this._chunkBytes >= this._file.size;
    const endPosition = isLastChunk ? this._file.size : this._position + this._chunkBytes;

    const blob = this._file.slice(this._position, endPosition);

    for (let retry = 0; retry <= this._retryDelays.length; retry += 1) {
      try {
        this._isUploadingLastChunk = isLastChunk;

        const chunkFormData = new FormData();
        chunkFormData.set('blob', blob);
        chunkFormData.set('offset', this._position.toString());
        chunkFormData.set('length', blob.size.toString());
        chunkFormData.set('retry', retry.toString());
        chunkFormData.set('total', this._file.size.toString());
        chunkFormData.set('isLastChunk', isLastChunk ? 'true' : 'false');

        await this._onChunkUpload(chunkFormData as ChunkFormData, this._metadata);
        break;
      } catch (error) {
        if (this.status === 'pausing') return false;
        if (retry < this._retryDelays.length) await wait(this._retryDelays[retry]);
        else {
          this.status = 'error';
          this._error = error;
          if (this._onError) this._onError(error);
          throw error;
        }
      } finally {
        this._isUploadingLastChunk = false;
      }
    }

    this._position = endPosition;
    if (isLastChunk) this.status = 'complete';

    if (this._onChunkComplete) this._onChunkComplete(endPosition, this._file.size);
    if (isLastChunk && this._onSuccess) this._onSuccess();

    return isLastChunk;
  }

  protected _validateOptions(options: ChunkUploaderOptions<TMetadata>) {
    if (!options.file) throw new Error('File is required');
    if (!(options.file instanceof File)) throw new Error('File must be an instance of File');

    if (typeof options.onChunkUpload !== 'function')
      throw new Error('onChunkUpload must be a function');

    if (options.chunkBytes !== undefined) {
      if (typeof options.chunkBytes !== 'number') throw new Error('Chunk size must be a number');
      if (!Number.isInteger(options.chunkBytes)) throw new Error('Chunk size must be an integer');
      if (options.chunkBytes <= 0) throw new Error('Chunk size must be greater than 0');
    }

    if (options.retryDelays !== undefined) {
      if (!Array.isArray(options.retryDelays)) throw new Error('Retry delays must be an array');
      for (const delay of options.retryDelays) {
        if (typeof delay !== 'number') throw new Error('Retry delay must be a number');
        if (!Number.isInteger(delay)) throw new Error('Retry delay must be an integer');
        if (delay < 0) throw new Error('Retry delay must be greater than or equal to 0');
      }
    }

    if (options.onChunkComplete !== undefined) {
      if (typeof options.onChunkComplete !== 'function')
        throw new Error('onChunkComplete must be a function');
    }

    if (options.onSuccess !== undefined) {
      if (typeof options.onSuccess !== 'function') throw new Error('onSuccess must be a function');
    }

    if (options.onError !== undefined) {
      if (typeof options.onError !== 'function') throw new Error('onError must be a function');
    }

    if (options.onPaused !== undefined) {
      if (typeof options.onPaused !== 'function') throw new Error('onPaused must be a function');
    }

    if (options.onAborted !== undefined) {
      if (typeof options.onAborted !== 'function') throw new Error('onAborted must be a function');
    }

    if (options.onStatusChange !== undefined) {
      if (typeof options.onStatusChange !== 'function')
        throw new Error('onStatusChange must be a function');
    }
  }
}

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
