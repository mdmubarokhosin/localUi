import * as pdfjs from 'pdfjs-dist';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../store/app';
import { useInferenceContext } from '../store/inference';
import { MessageExtra } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

export interface FileUploadApi {
  items?: MessageExtra[];
  addItems: (items: MessageExtra[]) => void;
  removeItem: (idx: number) => void;
  clearItems: () => void;
  onFileAdded: (files: File[]) => void;
}

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/ogg',
  'video/webm',
]);

export function useFileUpload(
  initialItems: MessageExtra[] = []
): FileUploadApi {
  const { t } = useTranslation();
  const {
    config: { pdfAsImage },
  } = useAppContext();
  const { selectedModel } = useInferenceContext();
  const [items, setItems] = useState<MessageExtra[]>(initialItems);

  const addItems = (newItems: MessageExtra[]) => {
    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearItems = () => {
    setItems([]);
  };

  const isSupportVision = selectedModel?.modalities?.includes('image');

  const onFileAdded = async (files: File[]) => {
    try {
      for (const file of files) {
        const mimeType = file.type;

        // Empty file detection
        if (file.size === 0) {
          toast.error(t('fileUpload.errors.emptyFile', { name: file.name }), { duration: 4000 });
          continue;
        }

        if (file.size > 500 * 1024 * 1024) {
          toast.error(t('fileUpload.errors.fileTooLarge'));
          break;
        }

        if (mimeType.startsWith('image/')) {
          if (!isSupportVision) {
            toast.error(t('fileUpload.errors.multimodalNotSupported'));
            break;
          }

          let base64Url = await getFileAsBase64(file, true, t);
          if (mimeType === 'image/svg+xml') {
            base64Url = await svgBase64UrlToPngDataURL(base64Url, t);
          }
          addItems([
            {
              type: 'imageFile',
              name: file.name,
              base64Url,
            },
          ]);
        } else if (mimeType.startsWith('video/') && VIDEO_MIME_TYPES.has(mimeType)) {
          // Video upload support - convert to base64 data URL
          const base64DataUrl = await getFileAsBase64(file, true, t);
          addItems([
            {
              type: 'videoFile',
              name: file.name,
              base64Data: base64DataUrl,
              mimeType,
            },
          ]);
        } else if (mimeType.startsWith('video/')) {
          toast.error(t('fileUpload.errors.videoNotSupported'));
          break;
        } else if (mimeType.startsWith('audio/')) {
          if (!/mpeg|wav/.test(mimeType)) {
            toast.error(t('fileUpload.errors.audioNotSupported'));
            break;
          }

          const base64Data = await getFileAsBase64(file, false, t);
          addItems([
            {
              type: 'audioFile',
              name: file.name,
              mimeType,
              base64Data,
            },
          ]);
        } else if (mimeType.startsWith('application/pdf')) {
          if (pdfAsImage && !isSupportVision) {
            toast(t('fileUpload.errors.pdfMultimodalNotSupported'));
            break;
          }

          if (pdfAsImage && isSupportVision) {
            const base64Urls = await convertPDFToImage(file, t);
            addItems(
              base64Urls.map((base64Url) => ({
                type: 'imageFile',
                name: file.name,
                base64Url,
              }))
            );
          } else {
            const content = await convertPDFToText(file, t);
            addItems([
              {
                type: 'textFile',
                name: file.name,
                content,
              },
            ]);
            if (isSupportVision) {
              toast.success(t('fileUpload.notifications.pdfConvertedToText'));
            }
          }
          break;
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const content = event.target.result as string;
              if (!isLikelyNotBinary(content)) {
                toast.error(t('fileUpload.errors.fileIsBinary'));
                return;
              }
              addItems([
                {
                  type: 'textFile',
                  name: file.name,
                  content,
                },
              ]);
            }
          };
          reader.readAsText(file);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = t('fileUpload.errorProcessingFile', {
        message,
      });
      toast.error(errorMessage);
    }
  };

  return {
    items: items.length > 0 ? items : undefined,
    addItems,
    removeItem,
    clearItems,
    onFileAdded,
  };
}

async function getFileAsBase64(
  file: File,
  outputUrl = true,
  t: ReturnType<typeof useTranslation>['t']
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        let result = event.target.result as string;
        if (!outputUrl) {
          result = result.substring(result.indexOf(',') + 1);
        }
        resolve(result);
      } else {
        reject(new Error(t('fileUpload.errors.failedToReadFile')));
      }
    };
    reader.readAsDataURL(file);
  });
}

async function getFileAsBuffer(
  file: File,
  t: ReturnType<typeof useTranslation>['t']
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error(t('fileUpload.errors.failedToReadFile')));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function convertPDFToText(
  file: File,
  t: ReturnType<typeof useTranslation>['t']
): Promise<string> {
  const buffer = await getFileAsBuffer(file, t);
  const pdf = await pdfjs.getDocument(buffer).promise;
  const numPages = pdf.numPages;
  const textContentPromises: Promise<TextContent>[] = [];
  for (let i = 1; i <= numPages; i++) {
    textContentPromises.push(
      pdf.getPage(i).then((page) => page.getTextContent())
    );
  }
  const textContents = await Promise.all(textContentPromises);
  const textItems = textContents.flatMap((textContent: TextContent) =>
    textContent.items.map((item) => (item as TextItem).str ?? '')
  );
  return textItems.join('\n');
}

async function convertPDFToImage(
  file: File,
  t: ReturnType<typeof useTranslation>['t']
): Promise<string[]> {
  const buffer = await getFileAsBuffer(file, t);
  const doc = await pdfjs.getDocument(buffer).promise;
  const pages: Promise<string>[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    if (!ctx) {
      throw new Error(t('fileUpload.errors.failedToGetCanvasContext'));
    }
    const task = page.render({ canvasContext: ctx, viewport: viewport });
    pages.push(
      task.promise.then(() => {
        return canvas.toDataURL();
      })
    );
  }

  return await Promise.all(pages);
}

function isLikelyNotBinary(str: string): boolean {
  const options = {
    prefixLength: 1024 * 10,
    suspiciousCharThresholdRatio: 0.15,
    maxAbsoluteNullBytes: 2,
  };

  if (!str) return true;

  const sampleLength = Math.min(str.length, options.prefixLength);
  if (sampleLength === 0) return true;

  let suspiciousCharCount = 0;
  let nullByteCount = 0;

  for (let i = 0; i < sampleLength; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode === 0xfffd) { suspiciousCharCount++; continue; }
    if (charCode === 0x0000) { nullByteCount++; suspiciousCharCount++; continue; }
    if (charCode < 32) {
      if (charCode !== 9 && charCode !== 10 && charCode !== 13 && charCode !== 7 && charCode !== 8) {
        suspiciousCharCount++;
      }
    }
  }

  if (nullByteCount > options.maxAbsoluteNullBytes) return false;
  return suspiciousCharCount / sampleLength <= options.suspiciousCharThresholdRatio;
}

function svgBase64UrlToPngDataURL(
  base64UrlSvg: string,
  t: ReturnType<typeof useTranslation>['t']
): Promise<string> {
  const backgroundColor = 'white';

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error(t('fileUpload.errors.failedToGetCanvasContext')));
          return;
        }
        const targetWidth = img.naturalWidth || 300;
        const targetHeight = img.naturalHeight || 300;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        reject(new Error(t('fileUpload.errors.failedToLoadSvg')));
      };
      img.src = base64UrlSvg;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = t('fileUpload.errorConvertingSvg', { message });
      toast.error(errorMessage);
      reject(new Error(errorMessage));
    }
  });
}