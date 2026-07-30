"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import { toastMutationError, toastMutationSuccess } from "@/components/admin/adminToast";

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = await confirm({
      title: "Excluir este produto?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setLoading(true);
    try {
      await runMutation({ label: "Excluindo produto" }, async () => {
        const res = await mutationFetch(`/api/v1/admin/products/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao excluir");
        router.refresh();
        toastMutationSuccess("Produto excluído.", { id: "product-delete" });
      });
    } catch (err) {
      toastMutationError(err, { id: "product-delete" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoadingButton
      type="button"
      className="btn-quiet btn-quiet--danger"
      onClick={onDelete}
      loading={loading}
      loadingLabel="Excluindo…"
    >
      Excluir
    </LoadingButton>
  );
}
