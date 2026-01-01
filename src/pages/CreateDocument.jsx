import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import FieldBuilder from "../components/FieldBuilder";
import DynamicForm from "../components/DynamicForm";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import "./CreateDocument.css";

function CreateDocument({ onBack, editData = null }) {
  const { currentUser } = useAuth();
  // Document title
  const [title, setTitle] = useState(editData?.title || '');
  // Fields: array of objects { id, label, type, options }
  const [fields, setFields] = useState(editData?.fields || []);
  // Data: object { [fieldId]: value }
  const [data, setData] = useState(editData?.data || {});
  const [saving, setSaving] = useState(false);

  // Update state when editData changes
  useEffect(() => {
    if (editData) {
      setFields(Array.isArray(editData.fields) ? [...editData.fields] : []);
      setData(prev => ({ ...prev, ...(editData.data || {}) }));
    }
  }, [editData]);

  // Add a new field safely
  const addField = (field) => {
    if (!field?.id || !field?.type) {
      console.error('Invalid field data');
      return;
    }
    
    const newField = {
      id: field.id,
      type: field.type,
      label: field.label || `Field ${fields.length + 1}`,
      options: Array.isArray(field.options) ? [...field.options] : []
    };

    setFields(prev => {
      // Check if field with this ID already exists
      const exists = prev.some(f => f.id === field.id);
      if (exists) {
        console.warn(`Field with ID ${field.id} already exists`);
        return prev;
      }
      return [...prev, newField];
    });
  };

  // Remove a field by ID
  const removeField = (fieldId) => {
    if (!fieldId) return;
    
    if (window.confirm('Are you sure you want to remove this field?')) {
      setFields(prev => prev.filter(field => field.id !== fieldId));
      
      // Also remove the corresponding data if it exists
      setData(prev => {
        const newData = { ...prev };
        delete newData[fieldId];
        return newData;
      });
    }
  };

  // Save document
  const saveDocument = async (formData) => {
    if (saving) return; // Prevent multiple saves
    
    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('Please enter a document title');
      return;
    }
    
    // Validate that there are fields
    if (!Array.isArray(fields) || fields.length === 0) {
      alert('Please add at least one field to your document');
      return;
    }
    
    // Validate that at least one field has a non-empty value
    const hasAtLeastOneValue = Object.values(formData || {}).some(
      value => value !== undefined && value !== null && value !== ''
    );
    
    if (!hasAtLeastOneValue) {
      alert('Please fill in at least one field before saving');
      return;
    }
    
    setSaving(true);
    try {
      // Filter out empty/null/undefined values from formData
      const cleanFormData = {};
      Object.entries(formData || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanFormData[key] = value;
        }
      });
      
      const documentData = {
        title: trimmedTitle,
        data: cleanFormData,
        fields: fields.map(field => ({
          id: field.id,
          type: field.type,
          label: field.label,
          options: Array.isArray(field.options) ? [...field.options] : []
        })),
        updatedAt: serverTimestamp()
      };

      if (editData?.id) {
        await updateDoc(doc(db, "documents", editData.id), documentData);
      } else {
        if (!currentUser) {
          throw new Error("User not authenticated");
        }
        documentData.createdAt = serverTimestamp();
        documentData.userId = currentUser.uid;
        await addDoc(collection(db, "documents"), documentData);
      }

      alert("Document saved successfully!");
      onBack();
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Failed to save document. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (typeof onBack !== 'function') {
    return <div>Error: Missing required onBack prop</div>;
  }

  return (
    <main className="container">
      <button className="back-btn" onClick={onBack} type="button">
        ← Back
      </button>
      <h2>{editData ? "Edit Document" : "Create Document"}</h2>

      {/* Document Title */}
      <div className="form-group">
        <label htmlFor="document-title">Document Title *</label>
        <input
          id="document-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          className="form-control"
          required
        />
      </div>

      {/* Add new fields */}
      <FieldBuilder onAdd={addField} />

      {/* Form for filling data */}
      {Array.isArray(fields) && fields.length > 0 ? (
        <DynamicForm
          fields={fields}
          onSave={saveDocument}
          onRemoveField={removeField}
          saving={saving}
          initialData={data}
        />
      ) : (
        <p>Add fields to your document using the field builder above.</p>
      )}
    </main>
  );
}

CreateDocument.propTypes = {
  onBack: PropTypes.func.isRequired,
  editData: PropTypes.shape({
    id: PropTypes.string,
    fields: PropTypes.array,
    data: PropTypes.object,
    createdAt: PropTypes.any
  })
};

export default CreateDocument;
