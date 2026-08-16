import { describe, expect, it } from 'vitest';
import { billingRouter } from './billing';

function getRoutes() {
  return (billingRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
    }));
}

describe('billing routes', () => {
  it('registers authenticated account deletion', () => {
    expect(getRoutes()).toContainEqual({ path: '/account', methods: ['delete'] });
  });

  it('registers the public account deletion request flow', () => {
    expect(getRoutes()).toContainEqual({ path: '/account-deletion/request', methods: ['post'] });
    expect(getRoutes()).toContainEqual({ path: '/account-deletion/requests', methods: ['get'] });
    expect(getRoutes()).toContainEqual({ path: '/account-deletion/process', methods: ['post'] });
  });

  it('registers purchase verification and protected RTDN', () => {
    expect(getRoutes()).toContainEqual({ path: '/verify-purchase', methods: ['post'] });
    expect(getRoutes()).toContainEqual({ path: '/rtdn', methods: ['post'] });
  });
});
