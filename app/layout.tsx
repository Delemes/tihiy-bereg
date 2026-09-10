import type { Metadata } from 'next';
import './globals.css';
import './rpg-theme.css';
import './rpg-menu.css';
import './rpg-ui.css';
export const metadata: Metadata = {
  title: 'Тихий берег — истории, которые остаются',
  description:
    'Атмосферная 2D RPG о возвращении в российскую глубинку. Исследуйте Бережки, раскрывайте семейную историю и находите близких людей.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
