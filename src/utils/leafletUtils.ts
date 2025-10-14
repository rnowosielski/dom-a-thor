import L from 'leaflet';
import type { ExtendedPolygon, ExtendedImageOverlay, CoordinateArray } from '../types/leaflet';
import { cropToInnerRectangle } from './imageProcessor';

/**
 * Mirror an image using canvas and return as data URL
 */
const mirrorImage = async (imageUrl: string, mirrorX: boolean, mirrorY: boolean): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Apply mirroring transformations
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

/**
 * Create a draggable and transformable polygon
 */
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

/**
 * Process house image with cropping algorithm and optional mirroring
 */
const processHouseImage = async (
  imageUrl: string,
  mirrorX: boolean = false,
  mirrorY: boolean = false
): Promise<{ imageUrl: string, width?: number, height?: number }> => {
  try {
    // First apply the cropping algorithm
    const croppedImage= await cropToInnerRectangle(imageUrl);
    
    // Then apply mirroring if needed
    if (mirrorX || mirrorY) {
      return {imageUrl: await mirrorImage(croppedImage.imageUrl, mirrorX, mirrorY), width: croppedImage.width, height: croppedImage.height};
    }
    
    return croppedImage;
  } catch (error) {
    console.error('Failed to process house image:', error);
    // Fall back to original image if processing fails
    if (mirrorX || mirrorY) {
      try {
        return {imageUrl: await mirrorImage(imageUrl, mirrorX, mirrorY), width: undefined, height: undefined};
      } catch (mirrorError) {
        console.error('Failed to mirror fallback image:', mirrorError);
        return {imageUrl: imageUrl, width: undefined, height: undefined};
      }
    }
    return {imageUrl: imageUrl, width: undefined, height: undefined};
  }
};

/**
 * Calculate the proper image bounds that maintain aspect ratio and align longer sides
 * This function determines the best way to map the image to the polygon to avoid stretching
 */
const calculateOptimalImageBounds = (
  coordinates: CoordinateArray,
  imageWidth: number | undefined,
  imageHeight: number | undefined
): CoordinateArray => {
  if (!imageWidth || !imageHeight) {
    // Fallback to original coordinates if image dimensions are unknown
    return coordinates;
  }

  // Calculate polygon dimensions
  const side1Length = Math.sqrt(
    Math.pow(coordinates[1][0] - coordinates[0][0], 2) + 
    Math.pow(coordinates[1][1] - coordinates[0][1], 2)
  );
  const side2Length = Math.sqrt(
    Math.pow(coordinates[2][0] - coordinates[1][0], 2) + 
    Math.pow(coordinates[2][1] - coordinates[1][1], 2)
  );

  // Calculate image aspect ratio
  const imageAspectRatio = imageWidth / imageHeight;
  
  // Determine which side of the polygon is longer
  const polygonLongerSideIsFirst = side1Length > side2Length;
  // Determine if image is wider or taller
  const imageIsWider = imageAspectRatio > 1;
  
  // Calculate the proper bounds for the image
  let imageBounds: CoordinateArray;

  // The key insight: we need to ensure the longer side of the image aligns with the longer side of the polygon
  // This prevents stretching and maintains proper aspect ratio
  if ((polygonLongerSideIsFirst && imageIsWider)) {
    imageBounds = [
      coordinates[2],
      coordinates[3],
      coordinates[0],
      coordinates[1]
    ];
  }
  else if (!polygonLongerSideIsFirst && imageIsWider) {
    imageBounds = [
      coordinates[0],
      coordinates[1],
      coordinates[2],
      coordinates[3]
    ];
  } else if (polygonLongerSideIsFirst && !imageIsWider) {
    imageBounds = [
      coordinates[3],
      coordinates[0],
      coordinates[1],
      coordinates[2]
    ];
  }
  else {
    imageBounds = [
      coordinates[3],
      coordinates[0],
      coordinates[1],
      coordinates[2]
    ];
  }

  return imageBounds;
};

export const createRotatedImageOverlay = async (
  imageUrl: string,
  coordinates: CoordinateArray,
  mirrorX: boolean = false,
  mirrorY: boolean = false
): Promise<ExtendedImageOverlay> => {
  // Process the image with cropping and mirroring
  const {imageUrl: processedImageUrl, width: imageWidth, height: imageHeight} = await processHouseImage(imageUrl, mirrorX, mirrorY);

  // Calculate optimal image bounds that maintain aspect ratio and align longer sides
  const imageBounds = calculateOptimalImageBounds(coordinates, imageWidth, imageHeight);

  // @ts-expect-error The plugin does not offer typescript bindings
  const overlay = L.imageOverlay.rotated(processedImageUrl, imageBounds[3], imageBounds[0], imageBounds[2], {
    opacity: 1,
    interactive: true,
  }) as ExtendedImageOverlay;

  overlay.bringToFront();
  return overlay;
};

/**
 * Get coordinates from polygon as array of [lat, lng] pairs
 */
export const getPolygonCoordinates = (polygon: L.Polygon | null): CoordinateArray => {
  const latLngs = polygon?.getLatLngs()[0] as L.LatLng[];
  return latLngs.map(({ lat, lng }) => [lat, lng]);
};
