import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../shared/constants';

export const createTenantRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per tenant per window
    keyGenerator: (req) => {
        // rate limiting per tenant and not ip
        if(req.user?.tenant_id) {
            return req.user.tenant_id;
        }
        return 'unauthenticated';
    },
    validate: {
        ip: false, // disabled IP validation since we key by tenant_id not IP
    },
    handler: (req, res) => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            success: false,
            message: 'Too many requests from this tenant. Please try again later.',
            requestId: res.locals.requestId,
        });
    },
    skip: (req) => {
        // Skip rate limiting if no user context yet
        return !req.user;
    },
});
