import PageMain from './main'
import PageVpm from './vpm'

import {
  createBrowserRouter
} from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: "/",
    element: <PageMain />,
  },
  {
    path: "/vpm",
    element: <PageVpm />,
  }
]);

export default router
