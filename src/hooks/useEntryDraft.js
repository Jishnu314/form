import { useState } from "react";
import { uid } from "../utils/id.js";

const emptyDraft = { name: "", renewal: "" };
const emptyModal = { open: false, kind: null, editId: null, amount: "", scheme: "", error: "" };

export function useEntryDraft() {
  const [draft, setDraft] = useState(emptyDraft);
  const [rdList, setRdList] = useState([]);
  const [fdList, setFdList] = useState([]);
  const [nameError, setNameError] = useState("");
  const [modal, setModal] = useState(emptyModal);

  function reset() {
    setDraft(emptyDraft);
    setRdList([]);
    setFdList([]);
    setNameError("");
  }

  function setName(name) {
    setDraft((d) => ({ ...d, name }));
    if (nameError) setNameError("");
  }

  // ---- modal open helpers ----
  function openRenewalModal() {
    setModal({ open: true, kind: "renewal", editId: null, amount: draft.renewal || "", scheme: "", error: "" });
  }
  function openNewRD() {
    setModal({ open: true, kind: "rd", editId: null, amount: "", scheme: "", error: "" });
  }
  function openEditRD(item) {
    setModal({ open: true, kind: "rd", editId: item.id, amount: String(item.rdAmount), scheme: item.rdScheme, error: "" });
  }
  function openNewFD() {
    setModal({ open: true, kind: "fd", editId: null, amount: "", scheme: "", error: "" });
  }
  function openEditFD(item) {
    setModal({ open: true, kind: "fd", editId: item.id, amount: String(item.fdAmount), scheme: item.fdScheme, error: "" });
  }
  function closeModal() {
    setModal(emptyModal);
  }
  function setModalAmount(amount) {
    setModal((m) => ({ ...m, amount, error: "" }));
  }
  function setModalScheme(scheme) {
    setModal((m) => ({ ...m, scheme, error: "" }));
  }

  function saveModal() {
    const amt = Number(modal.amount);
    if (!modal.amount || amt <= 0) {
      setModal((m) => ({ ...m, error: "Enter an amount" }));
      return;
    }

    if (modal.kind === "renewal") {
      setDraft((d) => ({ ...d, renewal: String(amt) }));
      closeModal();
      return;
    }

    if (!modal.scheme.trim()) {
      setModal((m) => ({ ...m, error: "Enter a scheme name" }));
      return;
    }

    if (modal.kind === "rd") {
      setRdList((list) =>
        modal.editId
          ? list.map((it) => (it.id === modal.editId ? { ...it, rdAmount: amt, rdScheme: modal.scheme.trim() } : it))
          : [...list, { id: uid(), rdAmount: amt, rdScheme: modal.scheme.trim() }]
      );
    } else if (modal.kind === "fd") {
      setFdList((list) =>
        modal.editId
          ? list.map((it) => (it.id === modal.editId ? { ...it, fdAmount: amt, fdScheme: modal.scheme.trim() } : it))
          : [...list, { id: uid(), fdAmount: amt, fdScheme: modal.scheme.trim() }]
      );
    }
    closeModal();
  }

  function deleteModalItem() {
    if (modal.kind === "rd" && modal.editId) {
      setRdList((list) => list.filter((it) => it.id !== modal.editId));
    } else if (modal.kind === "fd" && modal.editId) {
      setFdList((list) => list.filter((it) => it.id !== modal.editId));
    } else if (modal.kind === "renewal") {
      setDraft((d) => ({ ...d, renewal: "" }));
    }
    closeModal();
  }

  // ---- validation + build the final entry object for submission ----
  function validate() {
    let ok = true;
    if (!draft.name.trim()) {
      setNameError("Name is required");
      ok = false;
    } else {
      setNameError("");
    }
    if (!draft.renewal || Number(draft.renewal) <= 0) {
      ok = false;
    }
    return ok;
  }

  function buildEntry() {
    const now = new Date();
    return {
      id: uid(),
      date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      timestamp: now.getTime(),
      name: draft.name.trim(),
      renewal: Number(draft.renewal),
      rdArray: rdList.map((rd) => ({ rdAmount: rd.rdAmount, rdScheme: rd.rdScheme })),
      fdArray: fdList.map((fd) => ({ fdAmount: fd.fdAmount, fdScheme: fd.fdScheme })),
    };
  }

  const rdTotal = rdList.reduce((s, r) => s + r.rdAmount, 0);
  const fdTotal = fdList.reduce((s, f) => s + f.fdAmount, 0);
  const draftTotal = (draft.renewal ? Number(draft.renewal) : 0) + rdTotal + fdTotal;

  return {
    draft,
    rdList,
    fdList,
    nameError,
    modal,
    rdTotal,
    fdTotal,
    draftTotal,
    setName,
    reset,
    validate,
    buildEntry,
    openRenewalModal,
    openNewRD,
    openEditRD,
    openNewFD,
    openEditFD,
    closeModal,
    setModalAmount,
    setModalScheme,
    saveModal,
    deleteModalItem,
  };
}
