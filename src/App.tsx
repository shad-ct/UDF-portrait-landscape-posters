import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "./utils/cropImage.js";

// Import the template images directly
import template4 from "./assets/template4.png";
import template3 from "./assets/template3.png";

interface ImageData {
  id: string;
  src: string;
  croppedImage: string | null;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: any;
}

const createHighQualityPoster = (
  croppedImageSrc: string,
  templateSrc: string,
  aspectRatio: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const posterCanvas = document.createElement("canvas");
    const ctx = posterCanvas.getContext("2d");

    const croppedImage = new Image();
    const templateImage = new Image();

    // Use a fixed high resolution for the final poster
    if (aspectRatio === 3 / 4) {
      posterCanvas.width = 1200;
      posterCanvas.height = 1600;
    } else {
      posterCanvas.width = 1600;
      posterCanvas.height = 1200;
    }

    let imagesLoaded = 0;
    const totalImages = 2;

    const onImageLoad = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        if (!ctx) {
          reject("Canvas context not available");
          return;
        }
        // Draw the cropped image first
        ctx.drawImage(
          croppedImage,
          0,
          0,
          posterCanvas.width,
          posterCanvas.height
        );

        // Draw the template image on top
        ctx.drawImage(
          templateImage,
          0,
          0,
          posterCanvas.width,
          posterCanvas.height
        );

        resolve(posterCanvas.toDataURL("image/png", 1.0));
      }
    };

    croppedImage.onload = onImageLoad;
    croppedImage.onerror = reject;
    croppedImage.src = croppedImageSrc;

    templateImage.onload = onImageLoad;
    templateImage.onerror = reject;
    templateImage.src = templateSrc;
  });
};

function App() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [template, setTemplate] = useState<string>(template4);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsProcessing(true);
      const newImages: ImageData[] = [];

      Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            const newImage: ImageData = {
              id: `image-${Date.now()}-${index}`,
              src: reader.result as string,
              croppedImage: null,
              crop: { x: 0, y: 0 },
              zoom: 1,
              croppedAreaPixels: null,
            };
            newImages.push(newImage);

            if (newImages.length === files.length) {
              setImages((prev) => [...prev, ...newImages]);
              setCurrentImageIndex(newImages.length > 0 ? 0 : -1);
              setIsProcessing(false);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const newImage: ImageData = {
            id: `camera-${Date.now()}`,
            src: reader.result as string,
            croppedImage: null,
            crop: { x: 0, y: 0 },
            zoom: 1,
            croppedAreaPixels: null,
          };
          setImages((prev) => [...prev, newImage]);
          setCurrentImageIndex(images.length);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = async () => {
    if (currentImageIndex === -1 || !images[currentImageIndex]) return;

    try {
      const currentImage = images[currentImageIndex];
      const croppedImg = await getCroppedImg(
        currentImage.src,
        croppedAreaPixels
      );

      setImages((prev) =>
        prev.map((img, index) =>
          index === currentImageIndex
            ? { ...img, croppedImage: croppedImg, croppedAreaPixels }
            : img
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadAll = async () => {
    const completedImages = images.filter((img) => img.croppedImage);
    if (completedImages.length === 0) return;

    setIsProcessing(true);

    for (let i = 0; i < completedImages.length; i++) {
      const image = completedImages[i];
      const dataUrl = await createHighQualityPoster(
        image.croppedImage!,
        template,
        aspectRatio
      );

      const link = document.createElement("a");
      link.download = `poster-${i + 1}.png`;
      link.href = dataUrl;
      link.click();

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
  };

  const handleDownloadSingle = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image || !image.croppedImage) return;

    const dataUrl = await createHighQualityPoster(
      image.croppedImage,
      template,
      aspectRatio
    );

    const link = document.createElement("a");
    link.download = `poster-${imageId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const removeImage = (imageId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== imageId);
      if (currentImageIndex >= filtered.length) {
        setCurrentImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const currentImage =
    currentImageIndex >= 0 ? images[currentImageIndex] : null;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div
          className="backdrop-blur-md bg-gray-800/80 shadow-2xl rounded-2xl p-6 w-full max-w-4xl border border-gray-600/50"
          style={{
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <h1 className="text-2xl font-bold text-center mb-4 text-gray-100">
            Sweet of madeena
          </h1>

          {/* Ratio Selection */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => {
                setAspectRatio(4 / 3);
                setTemplate(template4);
              }}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                aspectRatio === 4 / 3
                  ? "bg-green-500 text-white border-green-500"
                  : "backdrop-blur-md bg-gray-700/60 text-gray-100 hover:bg-gray-600/70 border border-gray-500/50"
              }`}
            >
              Landscape
            </button>
            <button
              onClick={() => {
                setAspectRatio(3 / 4);
                setTemplate(template3);
              }}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                aspectRatio === 3 / 4
                  ? "bg-green-500 text-white border-green-500"
                  : "backdrop-blur-md bg-gray-700/60 text-gray-100 hover:bg-gray-600/70 border border-gray-500/50"
              }`}
            >
              Portrait
            </button>
          </div>

          {/* Upload and Camera */}
          <div className="flex gap-2 mb-4">
            {/* File Upload Button */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer block w-full text-center backdrop-blur-md bg-gray-700/60 text-gray-100 py-2 rounded-lg hover:bg-gray-600/70 border border-gray-500/50 transition-all duration-300"
              >
                Choose Images
              </label>
            </div>

            {/* Camera Button */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
                id="camera-capture"
              />
              <label
                htmlFor="camera-capture"
                className="cursor-pointer block w-full text-center backdrop-blur-md bg-gray-700/60 text-gray-100 py-2 rounded-lg hover:bg-gray-600/70 border border-gray-500/50 transition-all duration-300"
              >
                Take Photo
              </label>
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mb-4 text-center text-gray-300">
              Processing images...
            </div>
          )}

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Selected Images ({images.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${
                      index === currentImageIndex
                        ? "border-green-500"
                        : "border-gray-600"
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img
                      src={image.src}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                    {image.croppedImage && (
                      <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                        ✓
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(image.id);
                      }}
                      className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 rounded opacity-75 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crop Section */}
          {currentImage && !currentImage.croppedImage && (
            <div className="relative w-full h-64 bg-gray-700 rounded-lg mb-4">
              <Cropper
                image={currentImage.src}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}

          {currentImage && !currentImage.croppedImage && (
            <button
              onClick={handleCrop}
              className="w-full backdrop-blur-md bg-gray-700/60 text-gray-100 py-2 rounded-lg hover:bg-gray-600/70 border border-gray-500/50 transition-all duration-300 mb-4"
            >
              Crop Current Image
            </button>
          )}

          {/* Final Posters Preview */}
          {images.some((img) => img.croppedImage) && (
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images
                  .filter((img) => img.croppedImage)
                  .map((image) => (
                    <div key={image.id} className="relative">
                      {/* The on-screen preview remains the same, but the download logic has changed */}
                      <div
                        className="relative w-full max-w-md mx-auto"
                        style={{ aspectRatio: `${aspectRatio}` }}
                      >
                        <img
                          src={image.croppedImage!}
                          alt="Cropped"
                          className="w-full h-full object-cover"
                        />
                        <img
                          src={template}
                          alt="Template Overlay"
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                      <button
                        onClick={() => handleDownloadSingle(image.id)}
                        className="mt-2 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-all duration-300 text-sm"
                      >
                        Download This Poster
                      </button>
                    </div>
                  ))}
              </div>

              <button
                onClick={handleDownloadAll}
                disabled={isProcessing}
                className="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-600 transition-all duration-300"
              >
                {isProcessing
                  ? "Downloading..."
                  : `Download All Posters (${
                      images.filter((img) => img.croppedImage).length
                    })`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
