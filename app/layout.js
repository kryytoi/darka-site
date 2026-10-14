import './globals.css';
import './chat-theme.css';

export const metadata = {
  title: 'Darka — нейросеть, с которой можно думать вслух',
  description: 'Darka — нейросеть с четырьмя моделями: Quiziw 7.0, Shadow 1.0, Darka 0.1 и 0.2 Enchanted.',
};

export const viewport = {
  themeColor: '#0a0612',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
