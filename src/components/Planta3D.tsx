import React, { Suspense, lazy } from 'react';

type Props = { planta: any; width?: number; height?: number };

const LazyPlanta3D = lazy(() => import('./Planta3DInner'));

export default function Planta3D(props: Props) {
  return (
    <Suspense fallback={<div>Carregando 3D...</div>}>
      <LazyPlanta3D {...props} />
    </Suspense>
  );
}
