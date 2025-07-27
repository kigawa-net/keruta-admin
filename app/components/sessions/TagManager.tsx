import { useState } from "react";

interface TagManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagManager({ tags, onTagsChange }: TagManagerProps) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onTagsChange([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-3">
      <label className="form-label">タグ</label>
      <div className="input-group mb-2">
        <input
          type="text"
          className="form-control"
          placeholder="タグを入力してください"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleAddTag}
        >
          追加
        </button>
      </div>
      <div className="d-flex flex-wrap">
        {tags.map((tag, index) => (
          <span key={index} className="badge bg-primary me-2 mb-2">
            {tag}
            <button
              type="button"
              className="btn-close btn-close-white ms-2"
              aria-label="削除"
              onClick={() => handleRemoveTag(index)}
              style={{fontSize: "0.7em"}}
            />
          </span>
        ))}
      </div>
    </div>
  );
}