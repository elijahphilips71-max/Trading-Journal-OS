import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { BackIcon, LinkIcon } from "./icons";

type Props = {
  title: string;
  /** Show a back arrow that goes to this address. */
  back?: string;
  /** Show the logo before the title (Home only). */
  logo?: boolean;
  actions?: ReactNode;
};

export function PageHeader({ title, back, logo, actions }: Props) {
  return (
    <header className="hdr">
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back" style={{ marginLeft: -12 }}>
          <BackIcon />
        </Link>
      )}
      {logo && <Logo size={34} className="hide-desktop" />}
      <h1>{title}</h1>
      {actions}
      <Link href="/dad" className="icon-btn hide-desktop" aria-label="Dad's view">
        <LinkIcon />
      </Link>
    </header>
  );
}
