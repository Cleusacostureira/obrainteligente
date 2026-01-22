export type GalleryCategory = 'portas' | 'janelas' | 'moveis';

export type GalleryItem = {
  id: string;
  category: GalleryCategory;
  title: string;
  model?: string; // path to model (glb/gltf) or icon
  width: number; // meters
  height: number; // meters
  depth?: number; // meters (for furniture)
  meta?: Record<string, any>;
};

export type PlacedObject = {
  id: string;
  tipo: 'porta' | 'janela' | 'movel';
  modelo: string; // reference to GalleryItem.id
  paredeId?: string | null;
  ambienteId?: string | null;
  largura: number;
  altura: number;
  posicao: { x: number; y: number; z?: number; offset?: number };
};
