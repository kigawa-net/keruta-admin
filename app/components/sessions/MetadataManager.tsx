import { useState } from "react";

interface MetadataManagerProps {
  metadata: Record<string, string>;
  onMetadataChange: (metadata: Record<string, string>) => void;
}

export default function MetadataManager({ metadata, onMetadataChange }: MetadataManagerProps) {
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  const handleAddMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      onMetadataChange({...metadata, [metadataKey.trim()]: metadataValue.trim()});
      setMetadataKey("");
      setMetadataValue("");
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const newMetadata = {...metadata};
    delete newMetadata[key];
    onMetadataChange(newMetadata);
  };

  return (
    <div className="mb-3">
      <label className="form-label">メタデータ</label>
      <div className="row mb-2">
        <div className="col-5">
          <input
            type="text"
            className="form-control"
            placeholder="キー"
            value={metadataKey}
            onChange={(e) => setMetadataKey(e.target.value)}
          />
        </div>
        <div className="col-5">
          <input
            type="text"
            className="form-control"
            placeholder="値"
            value={metadataValue}
            onChange={(e) => setMetadataValue(e.target.value)}
          />
        </div>
        <div className="col-2">
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={handleAddMetadata}
          >
            追加
          </button>
        </div>
      </div>
      <div className="list-group">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>{key}:</strong> {value}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleRemoveMetadata(key)}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}