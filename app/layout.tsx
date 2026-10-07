import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Fuctura Tecnologia - Painel do Aluno',
  description: 'Plataforma educacional para alunos, professores e diretores da Fuctura Tecnologia com gestão de turmas, aulas, presença e gamificação.',
  applicationName: 'Fuctura',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fuctura',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Fuctura Tecnologia - Painel do Aluno',
    description: 'Plataforma educacional para alunos, professores e diretores da Fuctura Tecnologia com gestão de turmas, aulas, presença e gamificação.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fuctura Tecnologia - Painel do Aluno',
    description: 'Plataforma educacional para alunos, professores e diretores da Fuctura Tecnologia com gestão de turmas, aulas, presença e gamificação.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

