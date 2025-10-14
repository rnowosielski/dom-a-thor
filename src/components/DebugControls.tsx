import React from 'react';

interface DebugControlsProps {
  width: number;
  height: number;
  houseDataUrl: string | null;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onHouseDataUrlChange: (url: string | null) => void;
}

export const DebugControls: React.FC<DebugControlsProps> = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
  onHouseDataUrlChange,
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64DataUrl = e.target?.result as string;
        onHouseDataUrlChange(base64DataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <div>
        <label htmlFor="width">Width: </label>
        <input
          type="number"
          id="width"
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
        />
      </div>
      <div>
        <label htmlFor="height">Height: </label>
        <input
          type="number"
          id="height"
          value={height}
          onChange={(e) => onHeightChange(Number(e.target.value))}
        />
      </div>
      <div>
        <label htmlFor="imageUpload">Upload Image: </label>
        <input
          type="file"
          id="imageUpload"
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};
