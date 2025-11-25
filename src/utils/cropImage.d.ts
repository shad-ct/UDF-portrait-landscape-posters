interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export declare function getCroppedImg(
  imageSrc: string | null,
  pixelCrop: PixelCrop | null
): Promise<string>;
