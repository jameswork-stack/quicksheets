import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./DynamicForm.css";

function DynamicForm({ fields = [], onSave, onRemoveField, saving = false, initialData = {} }) {
  // Initialize form data with clean initial data
  const [formData, setFormData] = useState({});
  
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
    
    // Only update if there are actual changes
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
