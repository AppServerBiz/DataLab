export const metadata = {
  title: 'Supervision Nautilus Ultimate',
  description: 'Nautilus Wealth Manager',
}

import '../src/index.css'
import '../src/App.css'

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
