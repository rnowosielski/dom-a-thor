import L from 'leaflet';

export interface ExtendedPolygon extends L.Polygon {
  dragging?: L.Handler;
  transform: {
    enable: (options: { rotation: boolean; scaling: boolean }) => void;
    disable: () => void;
  };
}

export interface ExtendedImageOverlay extends L.ImageOverlay {
  bringToFront: () => this;
}

export type Coordinate = [number, number];
export type CoordinateArray = Coordinate[];
