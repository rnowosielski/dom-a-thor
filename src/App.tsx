import './App.css'
import DomAThor from "./components/DomAThor";
import {DebugControls} from "./components/DebugControls";
import {useLocalStorage} from "./hooks/useLocalStorage";
import {useChromeExtension} from "./hooks/useChromeExtension";
import {useEffect, useState} from "react";

function App() {

    const isDebugMode = typeof window === 'undefined' || !window.chrome;

    const [landId, setLandId] = useLocalStorage("landId", "");
    const [height, setHeight] = useState<number>(isDebugMode ? 25 : 0);
    const [width, setWidth] = useState<number>(isDebugMode ? 25 : 0);
    const [houseDataUrl, setHouseDataUrl] = useState<string | null>(null);
    const [mirrorX, setMirrorX] = useState<boolean>(false);
    const [mirrorY, setMirrorY] = useState<boolean>(false);

    const {landDetails} = useChromeExtension();

    // Update dimensions and image URL when Chrome extension provides land details
    useEffect(() => {
        if (landDetails) {
            setWidth(landDetails.width);
            setHeight(landDetails.height);
            setHouseDataUrl(landDetails.imageUrl);
        }
    }, [landDetails]);

    return (<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'}}>
            <div>
                <div
                    style={{
                        top: 10, left: 10, zIndex: 1000, padding: "10px", borderRadius: "5px",
                    }}
                >
                    {isDebugMode && (<DebugControls
                            width={width}
                            height={height}
                            houseDataUrl={houseDataUrl}
                            onWidthChange={setWidth}
                            onHeightChange={setHeight}
                            onHouseDataUrlChange={setHouseDataUrl}
                        />)}
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
                />
            </div>
        </div>)
}

export default App
