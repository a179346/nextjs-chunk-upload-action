<div align="center">
<h1 align="center"> ⭕ nextjs-chunk-upload-action ⭕</h1>

<p>
  <a href="https://github.com/a179346/nextjs-chunk-upload-action/actions/workflows/npm-publish.yml" target="_blank">
    <img alt="Documentation" src="https://github.com/a179346/nextjs-chunk-upload-action/actions/workflows/npm-publish.yml/badge.svg" />
  </a>
  <a href="https://www.npmjs.com/package/nextjs-chunk-upload-action" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/npm/v/nextjs-chunk-upload-action?maxAge=3600)" />
  </a>
  <a href="https://github.com/a179346/nextjs-chunk-upload-action#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/a179346/nextjs-chunk-upload-action/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/a179346/nextjs-chunk-upload-action/blob/master/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/a179346/nextjs-chunk-upload-action" />
  </a>
</p>
</div>

> Uploading large files with chunking using server action in Next.js

 ## 🔗 Link
+ [Github](https://github.com/a179346/nextjs-chunk-upload-action#readme)
+ [npm](https://www.npmjs.com/package/nextjs-chunk-upload-action)
+ [API Reference](https://github.com/a179346/nextjs-chunk-upload-action/blob/main/docs/api-reference.md)

## 📥 Install

```sh
npm i nextjs-chunk-upload-action
```

## 📖 Example

Example: [nextjs-chunk-upload-action-example](https://github.com/a179346/nextjs-chunk-upload-action-example)

```ts
// upload-form.tsx

'use client';

import { ChunkUploader } from 'nextjs-chunk-upload-action';

import { chunkUploadAction } from './chunk-upload-action';

export function UploadForm() {
  const handleFormAction = (formData: FormData) => {
    const file = formData.get('file') as File;
    if (!file) return;

    const uploader = new ChunkUploader({
      file,
      onChunkUpload: chunkUploadAction,
      metadata: { name: file.name },
      onChunkComplete: (bytesAccepted, bytesTotal) => {
        console.log('Progress:', `${bytesAccepted} / ${bytesTotal}`);
      },
      onError: error => {
        console.error(error);
      },
      onSuccess: () => {
        console.log('Upload complete');
      },
    });

    uploader.start();
  };

  return (
    <form className="flex flex-col items-center justify-center" action={handleFormAction}>
      <input name="file" type="file" required className="rounded-lg border-2 border-dashed p-4" />
      <button type="submit" className="mt-4 rounded-lg bg-blue-500 p-2 text-white">
        Upload
      </button>
    </form>
  );
}
```

```ts
// chunk-upload-action.ts

'use server';

import type { FileHandle } from 'fs/promises';
import { open } from 'fs/promises';
import { join } from 'path';

import type { ChunkUploadHandler } from 'nextjs-chunk-upload-action';

export const chunkUploadAction: ChunkUploadHandler<{ name: string }> = async (
  chunkFormData,
  metadata
) => {
  const blob = chunkFormData.get('blob');
  const offset = Number(chunkFormData.get('offset'));
  const buffer = Buffer.from(await blob.arrayBuffer());
  const filePath = join('./uploads', metadata.name);

  let fileHandle: FileHandle | undefined;
  try {
    fileHandle = await open(filePath, offset === 0 ? 'w' : 'r+');
    await fileHandle.write(buffer, 0, buffer.length, offset);
  } finally {
    await fileHandle?.close();
  }
};
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/a179346/nextjs-chunk-upload-action/issues).

## 🌟 Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2024 [a179346](https://github.com/a179346).<br />
This project is [MIT](https://github.com/a179346/nextjs-chunk-upload-action/blob/master/LICENSE) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_