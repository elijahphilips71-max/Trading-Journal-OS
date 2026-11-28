import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="page" style={{ minHeight: "80dvh", justifyContent: "center" }}>
      <div className="card items-start">
        <Logo size={40} />
        <span className="font-bold">Page not found</span>
        <span className="muted">That page doesn&apos;t exist, or the trade was deleted.</span>
        <Link className="btn pri" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
