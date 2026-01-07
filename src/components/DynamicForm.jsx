import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./DynamicForm.css";

function DynamicForm({ fields = [], onSave, onRemoveField, saving = false, initialData = {} }) {
  // Initialize form data with clean initial data
  const [formData, setFormData] = useState({});
  // Track extra inputs added per field (array of unique keys)
  const [extraInputs, setExtraInputs] = useState({});
  
  // Track if we've initialized the form data
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    // Skip if already initialized or no initialData
    if (isInitialized || !initialData || typeof initialData !== 'object') {
      return;
    }

    const cleanData = {};
    const extras = {};
    
    // First, find all base fields (non-extra fields)
    Object.entries(initialData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (!key.includes('__extra__') && !key.endsWith('_type') && !key.endsWith('_options')) {
        cleanData[key] = value;
      }
    });
    
    // Then, only process extra inputs that have actual values
    Object.entries(initialData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      
      // Only process extra inputs that have a value
      if (key.includes('__extra__') && value !== '') {
        const [baseKey] = key.split('__extra__');
        if (!extras[baseKey]) extras[baseKey] = [];
        if (!extras[baseKey].includes(key)) {
          extras[baseKey].push(key);
          cleanData[key] = value;
          
          // Include type and options if they exist
          const typeKey = `${key}_type`;
          const optionsKey = `${key}_options`;
          
          if (initialData[typeKey] !== undefined) {
            cleanData[typeKey] = initialData[typeKey];
          }
          if (initialData[optionsKey] !== undefined) {
            cleanData[optionsKey] = initialData[optionsKey];
          }
        }
      }
    });
    
    // Only update extra inputs if we found any with values
    if (Object.keys(extras).length > 0) {
      setExtraInputs(extras);
    }
    
    // Update form data in a single operation
    setFormData(prev => ({
      ...prev,
      ...cleanData
    }));
    
    // Mark as initialized to prevent re-running this effect
    setIsInitialized(true);
  }, [initialData, isInitialized]);

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
    // initialize value and type
    setFormData(prev => ({
      ...prev,
      [key]: "",
      [`${key}_type`]: "text",
      [`${key}_options`]: ""
    }));
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
            {Array.isArray(extraInputs[f.id]) && extraInputs[f.id].map(extraKey => {
              const extraType = formData[`${extraKey}_type`] || 'text';
              return (
                <div key={extraKey} className="extra-input-row">
                  <select
                    className="extra-type-select"
                    value={extraType}
                    onChange={e => handleChange(`${extraKey}_type`, e.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  {extraType === 'dropdown' && (
                    <input
                      type="text"
                      className="dropdown-options-input"
                      placeholder="Enter options (comma separated)"
                      value={formData[`${extraKey}_options`] || ''}
                      onChange={e => handleChange(`${extraKey}_options`, e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  
                  {extraType === 'dropdown' ? (
                    <select
                      className="extra-input"
                      value={formData[extraKey] || ""}
                      onChange={e => handleChange(extraKey, e.target.value)}
                      disabled={!formData[`${extraKey}_options`]}
                    >
                      <option value="">Select an option</option>
                      
                      
                      
                      SWE-1
                      
                      
                      
                      {formData[`${extraKey}_options`]?.split(',')
                        .map(opt => opt.trim())
                        .filter(opt => opt)
                        .map((opt, idx) => (
                          <option key={idx} value={opt}>
                            {opt}
                          </option>
                        ))
                      }
                    </select>
                  ) : (
                    <input
                      className="extra-input"
                      type={extraType}
                      placeholder={`Enter ${extraType}`}
                      value={formData[extraKey] || ""}
                      onChange={e => handleChange(extraKey, e.target.value)}
                    />
                  )}
                  
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
              );
            })}
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
