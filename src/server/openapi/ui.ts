import type { Router } from '../router/index.js'

export function serveSwaggerUI(router: Router, spec: Record<string, unknown>, path = '/docs'): void {
  router.get(path, async ({ response }) => {
    const specJson = JSON.stringify(spec, null, 2)
    response.html(`<!DOCTYPE html>
<html><head><title>SpeexJS API Docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ spec: ${specJson}, dom_id: '#swagger-ui' })</script>
</body></html>`)
  })
}
