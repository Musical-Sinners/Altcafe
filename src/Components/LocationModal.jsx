import { useEffect, useState } from "react";
import { ArrowRight, Armchair, PersonStanding, Trees } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import "./LocationModal.css";

export const TABLE_COUNT = 5;

/**
 * Asks the customer where they'll be for this order: at a numbered table,
 * standing, or on the turf. Shown right after "Checkout", before the
 * payment-method step. Result is passed up via onContinue({ type, table }).
 */
function LocationModal({ open, onClose, onContinue }) {
  const [type, setType] = useState("table"); // "table" | "standing" | "turf"
  const [table, setTable] = useState(null);

  useEffect(() => {
    if (open) {
      setType("table");
      setTable(null);
    }
  }, [open]);

  const canContinue = type !== "table" || !!table;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="loc-title">Where are you?</h2>
      <p className="loc-subtitle">This helps us bring your order to you.</p>

      <div className="loc-options">
        <button
          type="button"
          className={`loc-option ${type === "table" ? "selected" : ""}`}
          onClick={() => setType("table")}
        >
          <Armchair size={20} strokeWidth={2} />
          Table
        </button>
        <button
          type="button"
          className={`loc-option ${type === "standing" ? "selected" : ""}`}
          onClick={() => {
            setType("standing");
            setTable(null);
          }}
        >
          <PersonStanding size={20} strokeWidth={2} />
          Standing
        </button>
        <button
          type="button"
          className={`loc-option ${type === "turf" ? "selected" : ""}`}
          onClick={() => {
            setType("turf");
            setTable(null);
          }}
        >
          <Trees size={20} strokeWidth={2} />
          Turf
        </button>
      </div>

      {type === "table" && (
        <div className="loc-tables">
          {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              type="button"
              className={`loc-table-btn ${table === num ? "selected" : ""}`}
              onClick={() => setTable(num)}
            >
              {num}
            </button>
          ))}
        </div>
      )}

      <Button
        icon={ArrowRight}
        iconPosition="right"
        disabled={!canContinue}
        style={{ width: "100%" }}
        onClick={() => onContinue({ type, table: type === "table" ? table : null })}
      >
        Continue
      </Button>
    </Modal>
  );
}

export default LocationModal;