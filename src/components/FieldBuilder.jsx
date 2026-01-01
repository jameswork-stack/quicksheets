import { useState } from "react";
import "./FieldBuilder.css";

export default function FieldBuilder({ onAdd }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");

  const handleAdd = () => {
    if (!label) return;

    onAdd({
      id: Date.now(),
      label,
      type,
      options: type === "select"
        ? options.split(",").map(o => o.trim())
        : []
    });

    setLabel("");
    setOptions("");
  };

  return (
    <div className="field-builder">
      <input
        placeholder="Field label"
        value={label}
        onChange={e => setLabel(e.target.value)}
      />

      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="select">Dropdown</option>
      </select>

      {type === "select" && (
        <input
          placeholder="Options (comma separated)"
          value={options}
          onChange={e => setOptions(e.target.value)}
        />
      )}

      <button onClick={handleAdd}>+ Add Field</button>
    </div>
  );
}
