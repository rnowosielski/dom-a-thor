import L from 'leaflet';
import type { ExtendedPolygon, ExtendedImageOverlay, CoordinateArray } from '../types/leaflet';
import { cropToInnerRectangle, getImageNaturalDimensions } from './imageProcessor';

/**
 * Mirror an image using canvas and return as data URL
 */
const mirrorImage = async (imageUrl: string, mirrorX: boolean, mirrorY: boolean): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      if (mirrorX && mirrorY) {
        ctx.scale(-1, -1);
        ctx.drawImage(img, -canvas.width, -canvas.height);
      } else if (mirrorX) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, -canvas.width, 0);
      } else if (mirrorY) {
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, -canvas.height);
      } else {
        ctx.drawImage(img, 0, 0);
      }

      resolve(canvas.toDataURL());
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

export const createDraggablePolygon = (coordinates: CoordinateArray): ExtendedPolygon => {
  const polygon = L.polygon(coordinates, {
    color: "blue",
    fillOpacity: 0.1,
    // @ts-expect-error No proper bindings
    transform: true,
    draggable: true,
  }) as ExtendedPolygon;

  polygon.bringToFront();
  polygon.transform.enable({ rotation: true, scaling: false });
  polygon.dragging?.enable();

  return polygon;
};

const processHouseImage = async (
  imageUrl: string,
  mirrorX: boolean = false,
  mirrorY: boolean = false
): Promise<{ imageUrl: string, width?: number, height?: number }> => {
  try {
    const croppedImage = imageUrl.startsWith('data:')
      ? {
          imageUrl,
          ...(await getImageNaturalDimensions(imageUrl)),
        }
      : await cropToInnerRectangle(imageUrl);

    if (mirrorX || mirrorY) {
      return {
        imageUrl: await mirrorImage(croppedImage.imageUrl, mirrorX, mirrorY),
        width: croppedImage.width,
        height: croppedImage.height,
      };
    }

    return croppedImage;
  } catch (error) {
    console.error('Failed to process house image:', error);
    if (mirrorX || mirrorY) {
      try {
        return { imageUrl: await mirrorImage(imageUrl, mirrorX, mirrorY), width: undefined, height: undefined };
      } catch (mirrorError) {
        console.error('Failed to mirror fallback image:', mirrorError);
        return { imageUrl: imageUrl, width: undefined, height: undefined };
      }
    }
    return { imageUrl: imageUrl, width: undefined, height: undefined };
  }
};

/**
 * Map house footprint corners to L.imageOverlay.rotated(image, topleft, topright, bottomleft).
 * Image width follows the east-west edge; image height follows the north-south edge.
 * Input order from calculateHouseCoordinates: [0]=SW, [1]=NW, [2]=NE, [3]=SE.
 */
export const mapImageOverlayCorners = (
  coordinates: CoordinateArray
): [CoordinateArray[number], CoordinateArray[number], CoordinateArray[number]] => {
  return [coordinates[1], coordinates[2], coordinates[0]];
};

export const createRotatedImageOverlay = async (
  imageUrl: string,
  coordinates: CoordinateArray,
  mirrorX: boolean = false,
  mirrorY: boolean = false
): Promise<ExtendedImageOverlay> => {
  const { imageUrl: processedImageUrl } = await processHouseImage(imageUrl, mirrorX, mirrorY);
  const [topLeft, topRight, bottomLeft] = mapImageOverlayCorners(coordinates);

  // @ts-expect-error The plugin does not offer typescript bindings
  const overlay = L.imageOverlay.rotated(processedImageUrl, topLeft, topRight, bottomLeft, {
    opacity: 1,
    interactive: true,
  }) as ExtendedImageOverlay;

  overlay.bringToFront();
  return overlay;
};

export const getPolygonCoordinates = (polygon: L.Polygon | null): CoordinateArray => {
  const latLngs = polygon?.getLatLngs()[0] as L.LatLng[];
  return latLngs.map(({ lat, lng }) => [lat, lng]);
};
