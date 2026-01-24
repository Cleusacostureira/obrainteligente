import React, { useEffect, useState } from 'react';
import type { GalleryItem, GalleryCategory } from './types';

type Props = {
  categories?: GalleryCategory[];
  items?: GalleryItem[]; // optional override
  onSelectItem?: (item: GalleryItem) => void;
};

function mapFromJson(raw: any): GalleryItem[] {
  if (!raw) return [];
  const out: GalleryItem[] = [];
  (raw.doors || []).forEach((d: any) => {
    out.push({ id: d.id, category: 'portas', title: d.name, model: d.model3d, width: (d.widths && d.widths[0]) || d.width || 0, height: d.height || 2.1, depth: 0, meta: { ...d, preview: d.preview } });
  });
  (raw.windows || []).forEach((w: any) => {
    out.push({ id: w.id, category: 'janelas', title: w.name, model: w.model3d, width: (w.widths && w.widths[0]) || w.width || 0, height: w.height || 1.2, depth: 0, meta: { ...w, preview: w.preview } });
  });
  (raw.furniture || []).forEach((f: any) => {
    out.push({ id: f.id, category: 'moveis', title: f.name, model: f.model3d, width: f.width || 1, height: f.height || 1, depth: f.depth || 1, meta: { ...f, preview: f.preview } });
  });
  return out;
}

export default function GallerySidebar({ categories = ['portas','janelas','moveis'], items, onSelectItem }: Props) {
  const [cat, setCat] = useState<GalleryCategory>(categories[0]);
  const [loaded, setLoaded] = useState<GalleryItem[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (items && items.length > 0) { setLoaded(items); return; }
    // dynamic import of json data
    import('../../data/gallery3d.json').then((mod) => {
      const raw = (mod && (mod.default || mod));
      setLoaded(mapFromJson(raw));
    }).catch((err) => {
      console.warn('Could not load gallery3d.json, falling back to empty', err);
      setLoaded([]);
    });
  }, [items]);

  const filtered = (loaded || []).filter(i => i.category === cat);

  return (
    <aside style={{ width: 340, padding: 12, background: '#ffffff', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column', position: 'sticky', top: '72px', height: 'calc(100vh - 88px)', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Galeria 3D</h3>
        <div style={{ display: 'flex', gap: 8 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 8px', borderRadius: 6, border: cat===c? '2px solid #0ea5a4' : '1px solid #ddd', background: cat===c? '#ecfeff' : 'white' }}>{c}</button>
        ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.map(it => {
          const expanded = expandedId === it.id;
          return (
            <div key={it.id} onClick={() => setExpandedId(expanded ? null : it.id)} style={{ display: 'flex', gap: 12, padding: 16, borderBottom: '1px solid #f3f3f3', alignItems: 'center', minHeight: expanded ? 220 : 140, cursor: 'pointer', transition: 'min-height 200ms' }}>
            <div style={{ width: 140, height: 104, background: '#f8fafc', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={(it.meta && it.meta.preview) || (it.model && it.model.replace(/\.glb$/, '.jpg')) || '/assets/3d/thumb-sofa.svg'} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = '/assets/3d/thumb-sofa.svg'; }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{(it.width||0).toFixed(2)} x {(it.height||0).toFixed(2)} m</div>
              {expanded && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#334155' }}>
                  {it.meta && (it.meta.description || it.meta.desc) && <div style={{ marginBottom: 6 }}>{it.meta.description || it.meta.desc}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {it.meta && it.meta.wallOnly && <span style={{ fontSize: 12, color: '#047857' }}>Somente parede</span>}
                    {it.meta && it.meta.externalWallOnly && <span style={{ fontSize: 12, color: '#0ea5a4' }}>Parede externa</span>}
                    {it.meta && it.meta.floorOnly && <span style={{ fontSize: 12, color: '#0369a1' }}>Somente piso</span>}
                    <span style={{ fontSize: 12, color: '#475569' }}>Modelo: {it.model}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <button onClick={(e) => { e.stopPropagation(); onSelectItem && onSelectItem(it); }} style={{ padding: '8px 10px', borderRadius: 6, background: '#0ea5a4', color: 'white' }}>Selecionar</button>
            </div>
          </div>
        );
        })}
        {loaded && filtered.length === 0 && <div style={{ padding: 8, color: '#64748b' }}>Nenhum item nesta categoria.</div>}
        {!loaded && <div style={{ padding: 8, color: '#64748b' }}>Carregando...</div>}
      </div>
    </aside>
  );
}
