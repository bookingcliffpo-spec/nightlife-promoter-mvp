import Link from 'next/link';
const links = [['/dashboard','Dashboard'],['/events','Events'],['/campaigns','Campaigns'],['/contacts','Contacts'],['/integrations','Integrations']];
export function Nav(){return <aside className="min-h-screen w-64 border-r border-white/10 bg-black/40 p-6"><div className="mb-10 text-2xl font-black">NIGHT<span className="text-fuchsia-400">OPS</span></div><nav className="space-y-2">{links.map(([href,label])=><Link key={href} href={href} className="block rounded-xl px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white">{label}</Link>)}</nav></aside>}
