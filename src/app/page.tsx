import { MailApp } from "@/components/MailApp";
import { getDemoMailSnapshot } from "@/lib/demo-data";

export default function Home() {
  return <MailApp initialSnapshot={getDemoMailSnapshot()} />;
}
