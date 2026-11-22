import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tema.css'
import './index.css'
import './styles/responsive.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { VistaPublicaProvider } from './views/vistaPublica/contextDeVistaPublica.tsx'
import { AlertaOperacionProvider } from './contexto/AlertaOperacionContext.tsx'
import { iniciarTablasResponsive } from './utils/tablasResponsive.ts'

iniciarTablasResponsive()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertaOperacionProvider>
      <AuthProvider>
        <VistaPublicaProvider>
          <App />
        </VistaPublicaProvider>
      </AuthProvider>
    </AlertaOperacionProvider>
  </StrictMode>,
)
