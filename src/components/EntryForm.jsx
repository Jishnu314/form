import { Landmark, PiggyBank, Banknote, Check, Sigma } from "lucide-react";
import TapRow from "./TapRow.jsx";
import AmountSection from "./AmountSection.jsx";
import { formatINR } from "../utils/format.js";

export default function EntryForm({ draftState, onSubmit, rdEnabled = true, fdEnabled = true }) {
  const {
    draft,
    rdList,
    fdList,
    nameError,
    rdTotal,
    fdTotal,
    draftTotal,
    setName,
    openRenewalModal,
    openNewRD,
    openEditRD,
    openNewFD,
    openEditFD,
  } = draftState;

  return (
    <form className="rdfd-card" onSubmit={onSubmit} noValidate>
      <h2>
        <Landmark size={17} color="var(--accent-deep)" />
        New entry
      </h2>

      <div className="rdfd-field">
        <label>
          Name<span className="req">*</span>
        </label>
        <input
          type="text"
          placeholder="Customer name"
          value={draft.name}
          onChange={(e) => setName(e.target.value)}
          className={nameError ? "err" : ""}
          enterKeyHint="next"
          autoComplete="off"
        />
        {nameError && <div className="errmsg">{nameError}</div>}
      </div>

      <TapRow
        icon={<Landmark size={16} color="var(--accent-deep)" />}
        label="Renewal amount"
        required
        value={draft.renewal}
        onClick={openRenewalModal}
      />

      {rdEnabled && (
        <AmountSection
          icon={<PiggyBank size={13} />}
          label="New RD"
          kind="RD"
          items={rdList}
          amountKey="rdAmount"
          schemeKey="rdScheme"
          total={rdTotal}
          onAdd={openNewRD}
          onEditItem={openEditRD}
        />
      )}

      {fdEnabled && (
        <AmountSection
          icon={<Banknote size={13} />}
          label="New FD"
          kind="FD"
          items={fdList}
          amountKey="fdAmount"
          schemeKey="fdScheme"
          total={fdTotal}
          onAdd={openNewFD}
          onEditItem={openEditFD}
        />
      )}

      {draftTotal > 0 && (
        <div className="rdfd-draft-total">
          <span className="rdfd-draft-total-label">
            <Sigma size={14} /> Entry total
          </span>
          <span className="rdfd-draft-total-value">₹{formatINR(draftTotal)}</span>
        </div>
      )}

      <button type="submit" className="rdfd-submit">
        <Check size={18} /> Save entry
      </button>
    </form>
  );
}
