import React, {useEffect, useRef} from "react";
import {useMap} from "react-leaflet";
import type {CoordinateArray, ExtendedImageOverlay, ExtendedPolygon} from "../types/leaflet";
import {createDraggablePolygon, createRotatedImageOverlay, getPolygonCoordinates} from "../utils/leafletUtils";

interface DraggablePolygonProps {
    coordinates: CoordinateArray;
    houseDataUrl: string | null;
    /** Whether to automatically crop the image to remove measurement lines */
    autoCropImage?: boolean;
    /** Whether to mirror the image horizontally */
    mirrorX?: boolean;
    /** Whether to mirror the image vertically */
    mirrorY?: boolean;
}

export const DraggablePolygon: React.FC<DraggablePolygonProps> = ({
                                                                      coordinates,
                                                                      houseDataUrl,
                                                                      mirrorX = false,
                                                                      mirrorY = false,
                                                                  }) => {
    const map = useMap();
    const imageOverlayRef = useRef<ExtendedImageOverlay | null>(null);
    const polygonRef = useRef<ExtendedPolygon | null>(null);
    const mirrorXRef = useRef<boolean | null>(mirrorX);
    const mirrorYRef = useRef<boolean | null>(mirrorY);

    useEffect(() => {
        mirrorXRef.current = mirrorX;
        mirrorYRef.current = mirrorY;
    }, [mirrorX, mirrorY]);

    const handleStart = () => {
        cleanupImageOverlay();
    };

    const handleEnd = async () => {
        await reloadImageOverlay(polygonRef.current, mirrorXRef?.current ?? false, mirrorYRef?.current ?? false);
    };

    useEffect(() => {
        cleanupImageOverlay();
        if (coordinates.length < 3) return;
        const polygon: ExtendedPolygon = createDraggablePolygon(coordinates);
        polygonRef.current = polygon;
        polygon.addTo(map);
        polygon.transform.enable({rotation: true, scaling: false})

        polygon.on("rotatestart", handleStart);
        polygon.on("dragstart", handleStart);
        polygon.on("rotateend", handleEnd);
        polygon.on("dragend", handleEnd);

        // Cleanup function
        return () => {
            cleanupImageOverlay();
            polygon.dragging?.disable();
            polygon.transform?.disable();
            map.removeLayer(polygon);
        };
    }, [coordinates, houseDataUrl, map]);

    useEffect(() => {
        if (houseDataUrl && polygonRef.current) {
            cleanupImageOverlay();
            createRotatedImageOverlay(houseDataUrl, getPolygonCoordinates(polygonRef.current), mirrorX, mirrorY)
                .then(overlay => {
                    overlay.addTo(map);
                    polygonRef.current?.bringToFront();
                    imageOverlayRef.current = overlay;
                })
                .catch(error => {
                    console.error('Failed to create image overlay:', error);
                });
        }
    }, [coordinates, houseDataUrl, map, mirrorX, mirrorY]);

    const cleanupImageOverlay = () => {
        if (imageOverlayRef.current) {
            map.removeLayer(imageOverlayRef.current);
            imageOverlayRef.current = null;
        }
    };

    const reloadImageOverlay = async (polygon: ExtendedPolygon | null, mirrorX: boolean, mirrorY: boolean) => {
        cleanupImageOverlay();
        if (!houseDataUrl || !polygon) return;
        try {
            const currentCoordinates = getPolygonCoordinates(polygon);
            const overlay = await createRotatedImageOverlay(houseDataUrl, currentCoordinates, mirrorX, mirrorY);
            overlay.addTo(map);
            polygon.bringToFront();
            imageOverlayRef.current = overlay;
        } catch (error) {
            console.error('Failed to reload image overlay:', error);
        }
    };

    return null;
};