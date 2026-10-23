"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { holoTypes } from "@/lib/holo";

// Ein Link, der weiß, wie er fliegen soll: er gibt der Navigation den passenden Übergang mit.
export function HoloLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  return <Link href={href} transitionTypes={holoTypes(pathname, href)} {...props} />;
}
