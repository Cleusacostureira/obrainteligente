import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

const Login = lazy(() => import('../pages/login/page'));
const Projetos = lazy(() => import('../pages/projetos/page'));
const ProjetoDetalhes = lazy(() => import('../pages/projeto/page'));
const Calculadora = lazy(() => import('../pages/calculadora/page'));
const PlantaProjeto = lazy(() => import('../pages/projeto/planta/page'));
const NovoCusto = lazy(() => import('../pages/novo-custo/page'));
const Contratos = lazy(() => import('../pages/contratos/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/projetos',
    element: <Projetos />,
  },
  {
    path: '/calculadora',
    element: <Calculadora />,
  },
  {
    path: '/projeto/:id',
    element: <ProjetoDetalhes />,
  },
  {
    path: '/projeto/:id/calculadora',
    element: <Calculadora />,
  },
  {
    path: '/projeto/:id/novo-custo',
    element: <NovoCusto />,
  },
  {
    path: '/projeto/:id/planta',
    element: <PlantaProjeto />,
  },
  {
    path: '/contratos',
    element: <Contratos />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
