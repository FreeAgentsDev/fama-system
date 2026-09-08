import { redirect } from "next/navigation";

/**
 * `/admin` no tenía página, así que daba 404 — y el login redirige a lo que venga en
 * `?next=`, así que quien escribía `/admin`, metía el PIN y aterrizaba en un error.
 * Era la primera pantalla del panel para alguien que adivina la URL.
 *
 * No hay índice de administración que valga la pena: la pantalla útil es la de eventos.
 */
export default function AdminIndexPage() {
  redirect("/admin/eventos");
}
