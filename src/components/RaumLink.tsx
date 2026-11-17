"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { fahrtArten } from "@/lib/raeume";

// Ein Link in einen anderen Raum: Er gibt der Navigation mit, in welche Richtung die Kamera fährt.
export function RaumLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  return <Link href={href} transitionTypes={fahrtArten(pathname, href)} {...props} />;
}
