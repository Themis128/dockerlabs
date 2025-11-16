# Architecture Quick Reference

## 🏗️ System Overview

```
Browser → Nuxt Frontend (3001) → Nuxt API Proxy → Python Backend (3000) → Raspberry Pi Devices
```

## 📁 Directory Structure

```
dockerlabs/
├── components/          # Vue components (UI)
├── composables/         # Reusable logic (API calls, state)
├── stores/              # Pinia state management
├── server/api/          # Nuxt API proxy routes
├── web-gui/             # Python backend server
├── types/               # TypeScript definitions
├── utils/               # Utility functions
└── pages/               # Page components
```

## 🔄 Request Flow

1. **User Action** → Component
2. **Component** → Composable (`useApi`)
3. **Composable** → Nuxt API route (`/api/*`)
4. **Nuxt API** → Python backend (`http://localhost:3000/api/*`)
5. **Python** → Raspberry Pi (SSH/Telnet)
6. **Response** flows back through same path

## 🚀 Quick Start

```bash
# Terminal 1: Python Backend
npm run start:python

# Terminal 2: Nuxt Frontend
npm run dev

# Or both together
npm run dev:all
```

## 🔌 API Endpoints

All endpoints are accessed via `/api/*` from frontend:

- `GET /api/pis` - List Raspberry Pis
- `GET /api/sdcards` - List SD cards
- `POST /api/connect-ssh` - SSH connection
- `POST /api/execute-remote` - Execute command
- `GET /api/health` - Health check

## 📝 Code Patterns

### Making API Calls

```typescript
// In a component or composable
const { getPis, post } = useApi()

// Get data
const response = await getPis()
if (response.success) {
  // Use response.data
}

// Post data
const result = await post('/configure-pi', { pi_number: '1', settings: {...} })
```

### Creating Server API Route

```typescript
// server/api/example.ts
import { callPythonApi } from '../utils/python-api'

export default defineEventHandler(async (event) => {
  // Handle CORS
  if (getMethod(event) === 'OPTIONS') {
    return {}
  }

  const response = await callPythonApi(event, {
    endpoint: '/api/example',
    method: 'GET',
  })

  return response
})
```

### Using Pinia Store

```typescript
// stores/example.ts
export const useExampleStore = defineStore('example', {
  state: () => ({
    items: [],
  }),
  actions: {
    async fetchItems() {
      const { get } = useApi()
      const response = await get('/items')
      if (response.success) {
        this.items = response.data.items
      }
    },
  },
})

// In component
const store = useExampleStore()
await store.fetchItems()
```

## ⚙️ Configuration

### nuxt.config.ts
- `ssr: false` - SPA mode
- `apiBase: '/api'` - API base URL
- `pythonServerUrl: 'http://localhost:3000'` - Python server

### Environment Variables
```bash
API_BASE_URL=http://localhost:3000/api
PYTHON_SERVER_URL=http://localhost:3000
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Python backend not responding | Check if server is running on port 3000 |
| CORS errors | Verify CORS headers in server routes |
| API timeout | Increase timeout in `callPythonApi` |
| Build errors | Clear `.nuxt` and `.output`, reinstall deps |

## ✅ Best Practices

1. ✅ Always use `useApi` composable for API calls
2. ✅ Handle errors gracefully with user-friendly messages
3. ✅ Use Pinia stores for global state
4. ✅ Keep components focused and single-purpose
5. ✅ Validate inputs on both frontend and backend
6. ✅ Show loading states during async operations

## ❌ Anti-Patterns

1. ❌ Don't call Python backend directly from components
2. ❌ Don't ignore error responses
3. ❌ Don't store everything in global state
4. ❌ Don't expose technical errors to users
5. ❌ Don't make duplicate API calls

## 📊 State Management Flow

```
Component → Composable → API → Store → Component (reactive update)
```

## 🔒 Security Checklist

- [ ] Python backend not exposed to internet
- [ ] HTTPS in production
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Secrets in environment variables
- [ ] Authentication middleware active

## 📈 Performance Tips

- Lazy load components
- Debounce search inputs
- Cache API responses in stores
- Optimize images and assets
- Use computed properties for derived state

## 🧪 Testing

```bash
npm test              # All tests
npm run test:gui      # GUI tests
npm run test:api      # API tests
npm run test:components  # Component tests
```

## 📚 Key Files

- `nuxt.config.ts` - Nuxt configuration
- `server/utils/python-api.ts` - Python API client
- `composables/useApi.ts` - Frontend API composable
- `web-gui/server.py` - Python backend
- `pi-config.json` - Raspberry Pi configuration

---

For detailed information, see [ARCHITECTURE.md](./ARCHITECTURE.md)
