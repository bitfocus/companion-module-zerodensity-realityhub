# RealityHub Companion Module - Development Logbook

## 2025-12-28: Critical Bug Fix - Lino Engine ID vs Reality Engine ID

### Problem
The module was failing to load rundown items with errors like:
```
Failed to load items for rundown "RD_125" (ID: 110)
HTTPError for "http://172.16.0.118/api/rest/v1/lino/rundown/42/49/items/?api_key=..."
```

Despite rundowns being visible in the RealityHub dashboard and accessible via direct API calls.

### Root Cause
**RealityHub has TWO completely different engine systems with separate ID namespaces:**

| System | Endpoint | Purpose | Example IDs |
|--------|----------|---------|-------------|
| Reality Engines | `GET /api/rest/v1/engines` | Physical render engines | 41, 42, 44, 54, 56, 71 |
| Lino Engines | `GET /api/rest/v1/lino/engines` | Rundown control engines | 60, 65, 77, 81, 89, 92 |

The companion module was incorrectly using Reality Engine IDs (e.g., `42`) for Lino API calls that require Lino Engine IDs (e.g., `77`).

### Example
- Rundown "RD_125" (ID: 110) belongs to **Lino Engine 77** ("Show 125")
- The module was calling: `GET /lino/rundown/42/110/items/` ❌
- Should have called: `GET /lino/rundown/77/110/items/` ✅

### Affected API Endpoints
All Lino endpoints that include `{engineId}` in the path require **Lino Engine IDs**, not Reality Engine IDs:

```
GET  /api/rest/v1/lino/rundowns/{linoEngineId}
GET  /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
PUT  /api/rest/v1/lino/rundown/{linoEngineId}/play/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{linoEngineId}/out/{itemId}/{preview}
... etc
```

### Solution
1. **`features/engines.js`**: Added call to `GET /api/rest/v1/lino/engines` to fetch Lino engines and store them in `inst.data.linoEngines`

2. **`features/rundowns.js`**: Modified to iterate through each Lino engine, fetch its rundowns, and store the `linoEngineId` with each rundown for later use

3. **`features/templates.js`**: Updated to search for template pool rundown across all Lino engines

4. **`actions.js`**: Updated button trigger actions to use the stored `linoEngineId` from each rundown instead of a global ID

### Files Changed
- `features/engines.js` - Fetch and store Lino engines
- `features/rundowns.js` - Use Lino engine IDs for rundown/item queries
- `features/templates.js` - Use Lino engine IDs for template pool
- `actions.js` - Use correct Lino engine ID when triggering buttons

### Reference Implementation
The `rhub-api-dashboard` project correctly handles this in `src/lib/api.ts`:
```typescript
lino: {
    listEngines: () => request('GET', '/api/rest/v1/lino/engines'),
    listRundowns: (engineId: number) => request('GET', `/api/rest/v1/lino/rundowns/${engineId}`),
    listItems: (engineId: number, rundownId: number) => request('GET', `/api/rest/v1/lino/rundown/${engineId}/${rundownId}/items/`),
    // ...
}
```

### Debugging Tip
Use the MCP server to verify correct engine IDs:
```
mcp_rhub-mcp-server_get_v1_lino_eng
```
This returns Lino engines with their `loadedRundownsInfo` showing which rundowns belong to which Lino engine.

---

## 2025-12-28: API Key Authentication

### Issue
Some API calls were failing silently.

### Solution
The module now sends the API key both as:
1. HTTP Header: `X-API-Key: {apiKey}`
2. Query Parameter: `?api_key={apiKey}`

This matches the approach used in `rhub-mcp-server/index.js` for maximum compatibility across all RealityHub API endpoints.

---

## 2025-12-28: Playout API Deprecation Note

### Status
✅ **Verified**: The companion module does NOT use any deprecated Playout endpoints.

### Background
RealityHub has two rundown control APIs:

| API | Status | Playback Control | Button Triggers |
|-----|--------|------------------|-----------------|
| **Playout** (`/api/rest/v1/playout/*`) | ⚠️ DEPRECATED | ❌ No play/out/continue | ✅ Yes |
| **Lino** (`/api/rest/v1/lino/*`) | ✅ Current | ✅ Full control | ✅ Yes |

### Playout Endpoints (DO NOT USE)
```
GET  /api/rest/v1/playout/rundowns
GET  /api/rest/v1/playout/rundowns/{rundownId}
GET  /api/rest/v1/playout/rundowns/{rundownId}/items
POST /api/rest/v1/playout/rundowns/{rundownId}/items/{itemId}/{buttonKey}
GET  /api/rest/v1/playout/templates
```

### Lino Endpoints (USE THESE)
```
GET  /api/rest/v1/lino/engines
GET  /api/rest/v1/lino/rundowns/{engineId}
GET  /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
PUT  /api/rest/v1/lino/rundown/{engineId}/play/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{engineId}/out/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{engineId}/continue/{itemId}/{preview}
GET  /api/rest/v1/lino/templates
```

### Key Difference
Lino requires a **Lino Engine ID** in the path, while Playout uses only rundown IDs. See the "Lino Engine ID vs Reality Engine ID" section above for details on obtaining correct Lino Engine IDs.

---

## 2025-12-28: Dynamic Rundown Presets Feature

### Feature Added
Created dynamic presets from rundown item buttons:
- Scans all Lino engines for rundowns
- Extracts buttons from each rundown item
- Creates presets categorized as "Rundown: {rundownName}"
- Users can drag and drop these button presets into their Companion button grid

### Files Changed
- `presets.js` - Added rundown preset generation
- `features/rundowns.js` - Added preset refresh on rundown data update

### Legacy Template Pool
The "Rundown-Name For Templates" config field now supports:
- Specific rundown name (e.g., "CompanionTemplatesPool") for legacy behavior
- Empty or "*" to disable template pool sync and only use the new Rundowns feature

