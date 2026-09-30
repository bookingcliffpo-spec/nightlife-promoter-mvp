import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Cliff Open Video Studio",description:"Free open-source AI video workspace"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
