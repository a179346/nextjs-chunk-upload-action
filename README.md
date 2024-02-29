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
+ [npm](https://github.com/a179346/nextjs-chunk-upload-action)

## 📥 Install

```sh
npm i nextjs-chunk-upload-action
```

## 📖 Usage / Example

Demo Repository: [nextjs-chunk-upload-action-demo](https://github.com/a179346/nextjs-chunk-upload-action-demo)

```ts
// upload-form.tsx

"use client";

import { ChunkUploader } from "nextjs-chunk-upload-action";

import { chunkUploadAction } from "./chunk-upload-action";

export function UploadForm() {
  const handleFormAction = (formData: FormData) => {
    const file = formData.get("file") as File;
    if (!file) return;

    const uploader = new ChunkUploader({
      file,
      onChunkUpload: chunkUploadAction,
      metadata: { name: file.name },
      onChunkComplete: (bytesAccepted, bytesTotal) => {
        console.log("Progress:", `${bytesAccepted} / ${bytesTotal}`);
      },
      onError: (error) => {
        console.error(error);
      },
      onSuccess: () => {
        console.log("Upload complete");
      },
    });

    uploader.start();
  };

  return (
    <form
      className="flex flex-col items-center justify-center"
      action={handleFormAction}
    >
      <input
        name="file"
        type="file"
        className="p-4 border-2 border-dashed rounded-lg"
      />
      <button
        type="submit"
        className="mt-4 p-2 bg-blue-500 text-white rounded-lg"
      >
        Upload
      </button>
    </form>
  );
}
```

```ts
// chunk-upload-action.ts

"use server";

import { FileHandle, open } from "fs/promises";
import { join } from "path";
import { ChunkUploadHandler } from "nextjs-chunk-upload-action";

export const chunkUploadAction: ChunkUploadHandler<{ name: string }> = async (
  chunkFormData,
  offset,
  metadata
) => {
  const blob = chunkFormData.get("blob");
  const buffer = Buffer.from(await blob.arrayBuffer());
  const filePath = join("./uploads", metadata.name);

  let fileHandle: FileHandle | null = null;
  try {
    fileHandle = await open(filePath, offset === 0 ? "w" : "r+");
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