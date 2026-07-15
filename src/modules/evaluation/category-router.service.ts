
import { CategoryMappingRepository } from "./category-router.repo";

// Maps event types to notification categories
const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  transaction_created: 'billing',
  invoice_due: 'billing',
  user_onboarded: 'engagement',
  compliance_flagged: 'compliance',
  system_alert: 'system',
};

export class CategoryRouterService {

    constructor (
        private readonly repo = new CategoryMappingRepository(), 
    ){}

    async resolve(eventType: string, tenantId: string, productLine: string): Promise<string | null> {

        // tenant override
        const tenantMapping = await this.repo.findByTenant(eventType,tenantId);
        if(tenantMapping) return tenantMapping.category;

        // prod line override
        const prodLineMapping = await this.repo.findByProductLine(eventType, productLine);
        if(prodLineMapping) return prodLineMapping.category;

        return  DEFAULT_CATEGORY_MAP[eventType] ?? null
    }
}
