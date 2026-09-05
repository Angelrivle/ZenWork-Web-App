import { redirect } from "next/navigation";

// No existe un listado standalone en /organizations: el home ("/") ya
// funciona como panel de organizaciones + invitaciones pendientes.
export default function OrganizationsIndexPage() {
  redirect("/");
}
