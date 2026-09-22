import './App.css'
import DomAThor from "./components/DomAThor";
import {DebugControls} from "./components/DebugControls";
import {useLocalStorage} from "./hooks/useLocalStorage";
import {useChromeExtension} from "./hooks/useChromeExtension";
import {processPlotImageForOverlay, getImageNaturalDimensions} from "./utils/imageProcessor";
import {useEffect, useState} from "react";

const getIsExtensionPopup = () =>
    typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:';

const MIN_PLOT_SOURCE_MIN_SIDE = 320;
const MIN_PLOT_SOURCE_MAX_SIDE = 360;
const MIN_PLOT_CROP_WIDTH = 240;
const MIN_PLOT_CROP_HEIGHT = 360;

const isAcceptablePlotSource = (sourceWidth: number, sourceHeight: number) =>
    Math.min(sourceWidth, sourceHeight) >= MIN_PLOT_SOURCE_MIN_SIDE &&
    Math.max(sourceWidth, sourceHeight) >= MIN_PLOT_SOURCE_MAX_SIDE;

const isAcceptablePlotCrop = (cropWidth: number, cropHeight: number) =>
    cropWidth >= MIN_PLOT_CROP_WIDTH && cropHeight >= MIN_PLOT_CROP_HEIGHT;

const hasUsableCapturedPlot = (landDetails: {
    imageDataUrl?: string | null;
    sourceWidth?: number;
    sourceHeight?: number;
}) =>
    Boolean(landDetails.imageDataUrl) &&
    isAcceptablePlotSource(landDetails.sourceWidth ?? 0, landDetails.sourceHeight ?? 0);

function App() {
    const isExtensionPopup = getIsExtensionPopup();
    const isDebugMode = import.meta.env.DEV && !isExtensionPopup;

    const [landId, setLandId] = useLocalStorage("landId", "");
    const [height, setHeight] = useState<number>(isDebugMode ? 25 : 0);
    const [width, setWidth] = useState<number>(isDebugMode ? 25 : 0);
    const [houseDataUrl, setHouseDataUrl] = useState<string | null>(null);
    const [mirrorX, setMirrorX] = useState<boolean>(false);
    const [mirrorY, setMirrorY] = useState<boolean>(false);
    const [cropSizeLabel, setCropSizeLabel] = useState<string | null>(null);

    const {landDetails, connectionError} = useChromeExtension();

    useEffect(() => {
        if (!isExtensionPopup) return;
        document.documentElement.classList.add("extension-popup-root");
        document.body.classList.add("extension-popup-body");
        return () => {
            document.documentElement.classList.remove("extension-popup-root");
            document.body.classList.remove("extension-popup-body");
        };
    }, []);

    useEffect(() => {
        if (!landDetails) return;

        let cancelled = false;
        const applyLandDetails = async () => {
            let width = landDetails.width;
            let height = landDetails.height;
            let sourceImageUrl = hasUsableCapturedPlot(landDetails)
                ? landDetails.imageDataUrl!
                : landDetails.imageUrl;
            let sourceSizeLabel = hasUsableCapturedPlot(landDetails)
                ? `${landDetails.sourceWidth}×${landDetails.sourceHeight}`
                : null;
            let croppedImageUrl: string | null = null;
            let croppedWidth = 0;
            let croppedHeight = 0;

            try {
                let finalCrop = await processPlotImageForOverlay(
                    sourceImageUrl,
                    width,
                    height
                );

                if (
                    !isAcceptablePlotCrop(finalCrop.width, finalCrop.height) &&
                    sourceImageUrl !== landDetails.imageUrl
                ) {
                    sourceImageUrl = landDetails.imageUrl;
                    const remoteDimensions = await getImageNaturalDimensions(sourceImageUrl);
                    sourceSizeLabel = `${remoteDimensions.width}×${remoteDimensions.height}`;
                    finalCrop = await processPlotImageForOverlay(
                        sourceImageUrl,
                        width,
                        height
                    );
                }

                if (cancelled) return;
                croppedImageUrl = finalCrop.imageUrl;
                croppedWidth = finalCrop.width;
                croppedHeight = finalCrop.height;
            } catch (error) {
                console.error('Failed to process plot image for map overlay:', error);
            }

            if (cancelled) return;
            if (!croppedImageUrl || !isAcceptablePlotCrop(croppedWidth, croppedHeight)) {
                console.error('Plot crop unavailable; refusing to render uncropped diagram.');
                setCropSizeLabel(sourceSizeLabel ? `bad crop · src ${sourceSizeLabel}` : null);
                return;
            }
            setWidth(width);
            setHeight(height);
            setHouseDataUrl(croppedImageUrl);
            setCropSizeLabel(
                sourceSizeLabel
                    ? `src ${sourceSizeLabel} · crop ${croppedWidth}×${croppedHeight}`
                    : `${croppedWidth}×${croppedHeight}`
            );
        };

        void applyLandDetails();
        return () => {
            cancelled = true;
        };
    }, [landDetails]);

    return (
        <div className={isExtensionPopup ? "extension-popup" : "app-shell"}>
            <div className="app-controls">
                {isDebugMode && (
                    <DebugControls
                        width={width}
                        height={height}
                        houseDataUrl={houseDataUrl}
                        onWidthChange={setWidth}
                        onHeightChange={setHeight}
                        onHouseDataUrlChange={setHouseDataUrl}
                    />
                )}
                <div>
                    <label htmlFor="landId">Land ID: </label>
                    <input
                        type="text"
                        id="landId"
                        value={landId}
                        onChange={(e) => setLandId(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="mirrorX">Mirror X: </label>
                    <input
                        type="checkbox"
                        id="mirrorX"
                        checked={mirrorX}
                        onChange={(e) => setMirrorX(e.target.checked)}
                    />
                    <label htmlFor="mirrorY">Mirror Y: </label>
                    <input
                        type="checkbox"
                        id="mirrorY"
                        checked={mirrorY}
                        onChange={(e) => setMirrorY(e.target.checked)}
                    />
                </div>
            </div>
            <DomAThor
                landIdentifier={landId}
                houseDataUrl={houseDataUrl}
                width={width}
                height={height}
                mirrorX={mirrorX}
                mirrorY={mirrorY}
                compact={isExtensionPopup}
            />
            {isExtensionPopup && (
                <div className="extension-version">
                    v1.0.1
                    {connectionError
                        ? ` · ${connectionError}`
                        : cropSizeLabel
                          ? ` · ${cropSizeLabel}`
                          : ''}
                </div>
            )}
        </div>
    );
}

export default App
