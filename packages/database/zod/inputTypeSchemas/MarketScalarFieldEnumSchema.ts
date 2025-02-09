import { z } from 'zod';

export const MarketScalarFieldEnumSchema = z.enum(['id','question','description','slug','closeDate','resolvedAt','createdBy','tags','ammAccountId','clearingAccountId','createdAt','updatedAt']);

export default MarketScalarFieldEnumSchema;
