/**
 * Uploading large files with chunking using server action in Next.js
 */

type Primitive = string | boolean | number | undefined | null;

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
  onChunkUpload: ChunkUploadHandler<TMetadata>;
  metadata: TMetadata;
  /**
   * The number of bytes to send in each chunk. Defaults to 5MB.
   */
  chunkBytes?: number;
  /**
   * Milliseconds to wait before retrying a failed chunk upload. Defaults to [1000, 2000, 4000, 8000].
   * Set to an empty array to disable retries.
   */
  retryDelays?: number[];
  /**
   * A callback that is called when a chunk is uploaded.
   */
  onChunkComplete?: (bytesAccepted: number, bytesTotal: number) => void;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
  onStatusChange?: (oldStatus: ChunkUploaderStatus, newStatus: ChunkUploaderStatus) => void;
}

export type ChunkUploaderStatus = 'pending' | 'uploading' | 'complete' | 'error';

export class ChunkUploader<TMetadata extends Metadata> {
  constructor(options: ChunkUploaderOptions<TMetadata>) {
    this._status = 'pending';

    this._validateOptions(options);

    this._file = options.file;
    this._onChunkUpload = options.onChunkUpload;
    this._chunkBytes = options.chunkBytes || 1024 * 1024 * 5;
    this._metadata = options.metadata;
    this._retryDelays = options.retryDelays || [1000, 2000, 4000, 8000];
    this._onChunkComplete = options.onChunkComplete;
    this._onError = options.onError;
    this._onSuccess = options.onSuccess;
    this._onStatusChange = options.onStatusChange;
  }

  /**********
   * Public
   **********/
  /**
   * Start the upload process.
   * returns `false` if the upload process is already started.
   */
  public start() {
    if (this.status !== 'pending') return false;
    this.status = 'uploading';
    this._uploadChunk(0, 0);
  }

  public get status() {
    return this._status;
  }

  /**********
   * Protected
   **********/
  protected _status: ChunkUploaderStatus;
  protected set status(value: ChunkUploaderStatus) {
    const oldValue = this._status;
    if (oldValue === value) return;
    this._status = value;
    if (this._onStatusChange) this._onStatusChange(oldValue, value);
  }

  protected readonly _file: File;
  protected readonly _onChunkUpload: ChunkUploadHandler<TMetadata>;
  protected readonly _chunkBytes: number;
  protected readonly _metadata: TMetadata;
  protected readonly _retryDelays: number[];

  protected readonly _onChunkComplete?: (bytesAccepted: number, bytesTotal: number) => void;
  protected readonly _onError?: (error: unknown) => void;
  protected readonly _onSuccess?: () => void;
  protected readonly _onStatusChange?: (
    oldStatus: ChunkUploaderStatus,
    newStatus: ChunkUploaderStatus
  ) => void;

  protected _uploadChunk(offset: number, currentChunkRetry: number) {
    const isLastChunk = offset + this._chunkBytes >= this._file.size;
    const to = isLastChunk ? this._file.size : offset + this._chunkBytes;

    const blob = this._file.slice(offset, to);
    const chunkFormData = new FormData();
    chunkFormData.set('blob', blob);
    chunkFormData.set('offset', offset.toString());
    chunkFormData.set('length', blob.size.toString());
    chunkFormData.set('retry', currentChunkRetry.toString());
    chunkFormData.set('total', this._file.size.toString());
    chunkFormData.set('isLastChunk', isLastChunk ? 'true' : 'false');

    this._onChunkUpload(chunkFormData as ChunkFormData, this._metadata)
      .then(() => {
        if (this._onChunkComplete) this._onChunkComplete(to, this._file.size);
        if (isLastChunk) {
          this.status = 'complete';
          if (this._onSuccess) this._onSuccess();
        } else {
          this._uploadChunk(to, 0);
        }
        return;
      })
      .catch(error => {
        if (currentChunkRetry < this._retryDelays.length) {
          setTimeout(() => {
            this._uploadChunk(offset, currentChunkRetry + 1);
          }, this._retryDelays[currentChunkRetry]);
          return;
        }
        this.status = 'error';
        if (this._onError) this._onError(error);
      });
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

    if (options.onError !== undefined) {
      if (typeof options.onError !== 'function') throw new Error('onError must be a function');
    }

    if (options.onSuccess !== undefined) {
      if (typeof options.onSuccess !== 'function') throw new Error('onSuccess must be a function');
    }

    if (options.onStatusChange !== undefined) {
      if (typeof options.onStatusChange !== 'function')
        throw new Error('onStatusChange must be a function');
    }
  }
}
