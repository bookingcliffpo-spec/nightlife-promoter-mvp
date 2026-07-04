import './globals.css';
import { Nav } from '@/components/Nav';
export const metadata = { title: 'NightOps Promoter MVP', description: 'AI nightlife promotional platform' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><div className="flex"><Nav/><main className="flex-1 p-8">{children}</main></div></body></html>; }
