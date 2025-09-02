# Keansa AI Suite 2025 - Frontend

Modern React frontend for the Keansa AI Suite data validation platform.

## 🚀 Railway Deployment

This frontend is configured for Railway deployment with the following features:

### Features
- **React 18**: Modern React with TypeScript
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component library
- **React Router**: Client-side routing
- **Axios**: HTTP client with interceptors
- **React Query**: Data fetching and caching

### Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **State Management**: React Query + Context API

## 🔧 Environment Variables

Configure these in your Railway frontend service:

```bash
# Backend API URL (Replace with your Railway backend URL)
VITE_API_URL=https://your-backend-service-name.up.railway.app
```

## 📦 Deployment Files

- `Procfile`: Production server configuration
- `package.json`: Dependencies and scripts
- `vite.config.ts`: Build configuration
- `railway.json`: Railway deployment settings
- `nixpacks.toml`: Build optimization
- `deploy.env`: Environment template

## 🏗️ Build Process

1. **Install Dependencies**: `npm ci`
2. **Build Application**: `npm run build` 
3. **Serve Static Files**: `npm run preview`

## 🔗 API Integration

The frontend connects to the backend via the `VITE_API_URL` environment variable:

- **Development**: Proxies to `http://127.0.0.1:5000`
- **Production**: Direct connection to Railway backend service

## 🎨 UI Components

Built with shadcn/ui components including:
- Forms with validation
- Data tables with sorting
- Modal dialogs
- Toast notifications
- Loading states
- Error boundaries

## 🛠️ Local Development

1. Install dependencies: `npm install`
2. Set environment variables in `.env.local`
3. Run dev server: `npm run dev`
4. Build for production: `npm run build`

## 🚀 Production Notes

- Optimized build with tree-shaking
- Static asset optimization
- Service worker for caching
- Error boundary for graceful failures
- Responsive design for all devices