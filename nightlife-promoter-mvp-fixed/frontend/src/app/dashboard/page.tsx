import { api } from '@/lib/api';
export default async function Dashboard(){
  let data:any={metrics:{upcomingEvents:0,contacts:0,campaigns:0,connectedIntegrations:0,projectedRevenue:0},insights:[]};
  try{data=await api('/api/dashboard')}catch{}
  const cards=[['Upcoming Events',data.metrics.upcomingEvents],['Contacts',data.metrics.contacts],['Campaigns',data.metrics.campaigns],['Connected Apps',data.metrics.connectedIntegrations],['Projected Revenue',`$${data.metrics.projectedRevenue.toLocaleString()}`]];
  return <div><h1 className="text-4xl font-black">Dashboard</h1><div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">{cards.map(([k,v])=><div className="card" key={k}><p className="text-white/50">{k}</p><p className="mt-2 text-3xl font-black">{v}</p></div>)}</div><div className="card mt-8"><h2 className="text-2xl font-bold">AI Promoter Insights</h2><div className="mt-4 space-y-3">{data.insights.map((i:string)=><p className="rounded-xl bg-black/30 p-4" key={i}>{i}</p>)}</div></div></div>
}
