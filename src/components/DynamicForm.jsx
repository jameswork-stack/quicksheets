import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./DynamicForm.css";

function DynamicForm({ fields = [], onSave, onRemoveField, saving = false, initialData = {} }) {
  // Initialize form data with clean initial data
  const [formData, setFormData] = useState({});
  // Track extra inputs added per field (array of unique keys)
  const [extraInputs, setExtraInputs] = useState({});
  
  // Update form data when initialData changes
  useEffect(() => {
    if (!initialData || typeof initialData !== 'object') {
      setFormData({});
      return;
    }
    
    // Create a clean version of initialData (remove undefined/null values)
    const cleanData = {};
    Object.entries(initialData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleanData[key] = value;
      }
    });
    
    // Build extraInputs map from keys like `${fieldId}__extra__...`
    const extras = {};
    Object.keys(cleanData).forEach(k => {
      const marker = "__extra__";
      if (k.includes(marker)) {
        const [fieldId] = k.split(marker);
        if (!extras[fieldId]) extras[fieldId] = [];
        extras[fieldId].push(k);
      }
    });

    // Ensure extraInputs state reflects any saved extra values
    setExtraInputs(prev => {
      // simple replace to match saved data
      return Object.keys(extras).length ? extras : prev;
    });

    // Only update formData if there are actual changes
    setFormData(prev => {
      // Check if current form data already matches the clean data
      const hasChanges = Object.keys(cleanData).some(
        key => prev[key] !== cleanData[key]
      ) || Object.keys(prev).some(
        key => cleanData[key] === undefined && prev[key] !== undefined
      );
      
      return hasChanges ? { ...prev, ...cleanData } : prev;
    });
  }, [initialData]);

  const handleChange = (id, value) => {
    if (!id) return;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const addExtraInput = (fieldId) => {
    if (!fieldId) return;
    const key = `${fieldId}__extra__${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    setExtraInputs(prev => {
      const arr = Array.isArray(prev[fieldId]) ? [...prev[fieldId], key] : [key];
      return { ...prev, [fieldId]: arr };
    });
    // initialize value
    setFormData(prev => ({ ...prev, [key]: "" }));
  };

  const removeExtraInput = (fieldId, extraKey) => {
    if (!fieldId || !extraKey) return;
    setExtraInputs(prev => {
      const arr = Array.isArray(prev[fieldId]) ? prev[fieldId].filter(k => k !== extraKey) : [];
      const next = { ...prev, [fieldId]: arr };
      if (arr.length === 0) delete next[fieldId];
      return next;
    });
    setFormData(prev => {
      const { [extraKey]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onSave === "function") {
      onSave(formData);
    }
  };

  if (!Array.isArray(fields)) return <div>Error: Invalid fields</div>;

  return (
    <form className="dynamic-form" onSubmit={handleSubmit}>
      {fields.map(f => {
        if (!f || !f.id) return null;
        const value = formData[f.id] || "";
        return (
          <div key={f.id} className="form-field">
            <div className="field-header">
              <label>{f.label}</label>
              <div style={{display: 'flex', gap: 8}}>
                <button
                  type="button"
                  className="add-input-btn"
                  onClick={() => addExtraInput(f.id)}
                  title="Add another input"
                  aria-label={`Add input under ${f.label}`}
                >
                  +
                </button>
                {onRemoveField && (
                  <button 
                    type="button" 
                    className="remove-field-btn"
                    onClick={() => onRemoveField(f.id)}
                    title="Remove field"
                    aria-label={`Remove ${f.label} field`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            {f.type === "select" ? (
              <select value={value} onChange={e => handleChange(f.id, e.target.value)}>
                <option value="">Select</option>
                {Array.isArray(f.options) && f.options.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type || "text"}
                value={value}
                onChange={e => handleChange(f.id, e.target.value)}
              />
            )}
            {/* Render any extra inputs for this field */}
            {Array.isArray(extraInputs[f.id]) && extraInputs[f.id].map(extraKey => (
              <div key={extraKey} className="extra-input-row">
                <input
                  className="extra-input"
                  type="text"
                  placeholder="Additional value"
                  value={formData[extraKey] || ""}
                  onChange={e => handleChange(extraKey, e.target.value)}
                />
                <button
                  type="button"
                  className="remove-extra-btn"
                  onClick={() => removeExtraInput(f.id, extraKey)}
                  title="Remove additional value"
                  aria-label={`Remove additional value for ${f.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {fields.length > 0 && (
        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? "Saving..." : "Save Document"}
        </button>
      )}
    </form>
  );
}

DynamicForm.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  onSave: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func,
  saving: PropTypes.bool,
  initialData: PropTypes.object
};

export default DynamicForm;
