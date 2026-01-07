// src/pages/Home.jsx
import { useState, useEffect } from "react";
import CreateDocument from "./CreateDocument";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  where,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { useAuth } from '../contexts/AuthContext';
import "./Home.css";

const GOOGLE_SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxwJDb3i2lLKYuwJxcl-v5pc3PohWFGbRPj4VPbYUg_jqrJpjBmAEWvQUYIp__qv34/exec";

export default function Home() {
  const [creating, setCreating] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null);
  const { currentUser } = useAuth();

  // Load documents from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadDocuments = async () => {
      try {
        // First try with the ordered query
        const q = query(
          collection(db, "documents"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              // Ensure we have a timestamp for sorting
              _timestamp: doc.data().createdAt?.toDate?.()?.getTime() || 0
            }));
            
            // Sort by timestamp in descending order (newest first)
            const sortedDocs = [...docs].sort((a, b) => {
              // If timestamps are equal, sort by title as a secondary sort
              if (b._timestamp === a._timestamp) {
                return (a.title || '').localeCompare(b.title || '');
              }
              return (b._timestamp || 0) - (a._timestamp || 0);
            });
            
            setDocuments(sortedDocs);
          },
          (error) => {
            console.error("Error loading documents:", error);
            // Fallback to a simpler query if the index isn't created yet
            if (error.code === 'failed-precondition') {
              console.log("Using fallback query with client-side sorting");
              const fallbackQuery = query(
                collection(db, "documents"),
                where("userId", "==", currentUser.uid)
              );
              
              onSnapshot(fallbackQuery, (snapshot) => {
                const docs = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  _timestamp: doc.data().createdAt?.toDate?.()?.getTime() || 0
                }));
                
                // Client-side sorting as fallback
                const sortedDocs = [...docs].sort((a, b) => {
                  if (b._timestamp === a._timestamp) {
                    return (a.title || '').localeCompare(b.title || '');
                  }
                  return (b._timestamp || 0) - (a._timestamp || 0);
                });
                
                setDocuments(sortedDocs);
              });
            }
          }
        );
        
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up document listener:", error);
      }
    };

    loadDocuments();
  }, [currentUser]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc(doc(db, "documents", id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleExport = (document) => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare the data with document title and field values
    const exportData = [];

    // Add document title as the first row
    exportData.push([document.title || 'Untitled']);
    exportData.push([]); // Empty row for spacing

    // Build headers and vertical data columns for each field, including extras
    const savedData = document.data || {};

    // Build columns: each column is an array of values (main value then any extras)
    const columns = (document.fields || []).map(field => {
      const col = [];
      col.push(savedData[field.id] || '');
      const extraKeys = Object.keys(savedData).filter(k => k.startsWith(`${field.id}__extra__`)).sort();
      extraKeys.forEach(k => col.push(savedData[k] || ''));
      return { label: field.label || 'Untitled Field', values: col };
    });

    const headers = columns.map(c => c.label);
    exportData.push(headers);

    // Determine the maximum number of rows needed (to accommodate extras)
    const maxRows = columns.reduce((mx, c) => Math.max(mx, c.values.length), 1);

    // Build rows from columns (so extras appear under the same header vertically)
    for (let r = 0; r < maxRows; r++) {
      const row = columns.map(c => c.values[r] || '');
      exportData.push(row);
    }
    
    // Add metadata
    exportData.push([]); // Empty row for spacing
    if (document.createdAt?.toDate) {
      exportData.push(['Created At', document.createdAt.toDate().toLocaleString()]);
    }
    
    // Convert data to worksheet
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    const colCount = headers.length;
    const colWidths = new Array(colCount).fill({ wch: 30 }).map((w, i) => ({ wch: i === 0 ? 20 : 30 }));
    ws['!cols'] = colWidths;
    
    // Merge cells for document title
    if (headers.length > 0) {
      ws['!merges'] = [
        XLSX.utils.decode_range("A1:" + XLSX.utils.encode_col(headers.length - 1) + "1")
      ];
    }
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Document Data');
    
    // Generate XLSX file and trigger download
    XLSX.writeFile(wb, `${document.title || 'document'}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exporting document:', error);
    alert('Failed to export document. Please try again.');
  }
};

  const handleCreateNew = () => {
    if (!currentUser) return;
    
    // Just set creating to true without creating a document
    // The document will be created when the user clicks save in the CreateDocument component
    setCreating(true);
    setEditingDoc(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'No date';
    return timestamp.toDate().toLocaleString();
  };

  return (
    <div className="app-container">
      {!creating && !editingDoc && (
        <main className="container">
          <div className="header-section">
            <h2>Your Documents</h2>
            <button 
              className="create-btn" 
              onClick={handleCreateNew}
              aria-label="Create new document"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Document
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="9" y1="12" x2="15" y2="12"></line>
                <line x1="12" y1="9" x2="12" y2="15"></line>
              </svg>
              <h3>No documents yet</h3>
              <p>Get started by creating your first document</p>
              <button 
                className="create-btn" 
                onClick={handleCreateNew}
                style={{ marginTop: '1rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Document
              </button>
            </div>
          ) : (
            <div className="document-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-header">
                    <h3>{doc.title}</h3>
                    <span className="document-date">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  <div className="document-actions">
                    <button 
                      className="btn-export"
                      onClick={() => handleExport(doc)}
                      title="Export to Excel"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Export
                    </button>
                    <button 
                      className="btn-edit"
                      onClick={() => setEditingDoc(doc)}
                      title="Edit document"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(doc.id)}
                      title="Delete document"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {(creating || editingDoc) && (
        <CreateDocument 
          onBack={() => {
            setCreating(false);
            setEditingDoc(null);
          }} 
          editData={editingDoc}
        />
      )}
    </div>
  );
}