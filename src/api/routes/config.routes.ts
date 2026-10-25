import { Router } from 'express';
import type { ProductCatalog } from '../../application/ports/product-catalog';
import { toProductsDto } from '../dto/product.dto';

interface ConfigRoutesDeps {
  publishableKey: string;
  catalog: ProductCatalog;
}

export function configRoutes({ publishableKey, catalog }: ConfigRoutesDeps): Router {
  const router = Router();

  router.get('/config', (_req, res) => {
    res.json({ publishableKey, productos: toProductsDto(catalog.list()) });
  });

  return router;
}
