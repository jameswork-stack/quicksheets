import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./TemplateList.css";

export default function TemplateList({ onSelect }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const snap = await getDocs(collection(db, "documentTemplates"));
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTemplates();
  }, []);

  return (
    <div className="template-grid">
      {templates.map(t => (
        <button
  type="button"
  className="template-card"
  onClick={() => onSelect(t)}
>

          <h3>{t.name}</h3>
          <p>{t.fields.length} fields</p>
        </button>
      ))}
    </div>
  );
}
