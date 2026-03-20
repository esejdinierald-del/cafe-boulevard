import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Check, Pencil, Hash } from "lucide-react";

interface TableIdentifierProps {
  language: "sq" | "en";
  tableNumber: string;
  isGeneric: boolean;
  onUpdate: (value: string) => void;
}

const translations = {
  sq: {
    placeholder: "Nr. ose vendndodhja",
    hint: "Shkruani nr. tavolinës ose ku ndodheni",
    edit: "Ndrysho",
    label: "Identifikohu",
  },
  en: {
    placeholder: "Nr. or location",
    hint: "Enter table nr. or where you are",
    edit: "Change",
    label: "Identify yourself",
  },
};

export const TableIdentifier = ({ language, tableNumber, isGeneric, onUpdate }: TableIdentifierProps) => {
  const t = translations[language];
  const [editing, setEditing] = useState(isGeneric);
  const [value, setValue] = useState(isGeneric ? "" : tableNumber);

  if (!isGeneric && !editing) return null;

  const handleSave = () => {
    if (value.trim()) {
      onUpdate(value.trim());
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-sm text-secondary/70 hover:text-secondary transition-colors mx-auto"
      >
        <Pencil className="w-3.5 h-3.5" />
        {t.edit}
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs mx-auto space-y-2">
      <p className="text-xs font-medium text-secondary/80 uppercase tracking-wider text-center">
        <Hash className="w-3 h-3 inline mr-1" />
        {t.label}
      </p>
      <div className="flex items-center gap-2 glass-gold rounded-full border-2 border-secondary/40 shadow-[var(--shadow-gold)] px-4 py-2 animate-pulse">
        <MapPin className="w-5 h-5 text-secondary/70 shrink-0" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.placeholder}
          maxLength={40}
          className="border-0 bg-transparent text-center text-lg font-display font-bold text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        <Button
          size="icon"
          onClick={handleSave}
          disabled={!value.trim()}
          className="h-9 w-9 rounded-full bg-secondary/20 hover:bg-secondary/40 border border-secondary/30 shrink-0"
        >
          <Check className="w-4 h-4 text-secondary" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground/50 text-center">{t.hint}</p>
    </div>
  );
};
