export function blobToBase64(blob: Blob, callback: (base64: string) => void) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(blob);
}
