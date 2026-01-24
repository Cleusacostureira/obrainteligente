import React, { Suspense, lazy } from 'react';

import type { GalleryItem, PlacedObject } from './ThreeGallery/types';

type Props = { planta: any; width?: number; height?: number; selectedGalleryItem?: GalleryItem | null; onPlaceObject?: (p: PlacedObject) => void; placedObjects?: PlacedObject[] };

const LazyPlanta3D = lazy(() => import('./Planta3DInner'));

export default function Planta3D(props: Props) {
  return (
    <Suspense fallback={<div>Carregando 3D...</div>}>
      <LazyPlanta3D {...props} />
    </Suspense>
  );
}
