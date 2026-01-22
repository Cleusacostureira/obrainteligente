import React from 'react';
import type { GalleryItem, GalleryCategory } from './types';

const DEFAULT_ITEMS: GalleryItem[] = [
  { id: 'p_madeira_lisa', category: 'portas', title: 'Porta madeira lisa 0.80x2.10', model: '', width: 0.8, height: 2.1, meta: { material: 'madeira' } },
  { id: 'j_correr_120', category: 'janelas', title: 'Janela correr 1.20x1.00', model: '', width: 1.2, height: 1.0, meta: { peitoril: 1.0 } },
  { id: 'm_sofa_2p', category: 'moveis', title: 'Sofá 2 lugares', model: '', width: 1.6, height: 0.8, depth: 0.8 }
];

type Props = {
  categories?: GalleryCategory[];
  items?: GalleryItem[];
  onSelectItem?: (item: GalleryItem) => void;
};

export default function GallerySidebar({ categories = ['portas','janelas','moveis'], items = DEFAULT_ITEMS, onSelectItem }: Props) {
  const [cat, setCat] = React.useState<GalleryCategory>(categories[0]);
  const filtered = items.filter(i => i.category === cat);

  return (
    <aside style={{ width: 320, padding: 12, background: '#ffffff', borderLeft: '1px solid #eee', height: '100%', overflow: 'auto' }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Galeria 3D</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 8px', borderRadius: 6, border: cat===c? '2px solid #0ea5a4' : '1px solid #ddd', background: cat===c? '#ecfeff' : 'white' }}>{c}</button>
        ))}
      </div>
      <div>
        {filtered.map(it => (
          <div key={it.id} style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #f3f3f3', alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#f8fafc', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* placeholder for thumbnail / 3D preview */}
              <span style={{ fontSize: 12, color: '#64748b' }}>3D</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{it.width} x {it.height} m</div>
            </div>
            <div>
              <button onClick={() => onSelectItem && onSelectItem(it)} style={{ padding: '6px 8px', borderRadius: 6, background: '#0ea5a4', color: 'white' }}>Selecionar</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
