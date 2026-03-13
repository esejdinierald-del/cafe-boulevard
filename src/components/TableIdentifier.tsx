import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Check, Pencil } from "lucide-react";

interface TableIdentifierProps {
  language: "sq" | "en";
  tableNumber: string;
  isGeneric: boolean;
  onUpdate: (value: string) => void;
}

const translations = {
  sq: {
    placeholder: "Nr. tavolinës ose vendndodhja juaj",
    hint: "Shkruani nr. e tavolinës ose një përshkrim (p.sh. 'pranë dritares')",
    save: "Ruaj",
    edit: "Ndrysho",
  },
  en: {
    placeholder: "Table number or your location",
    hint: "Enter table number or a description (e.g. 'near the window')",
    save: "Save",
    edit: "Edit",
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
        className="flex items-center gap-1.5 text-sm text-secondary/70 hover:text-secondary transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        {t.edit}
      </button>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/60" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.placeholder}
            maxLength={50}
            className="pl-9 bg-white/10 border-secondary/30 text-foreground placeholder:text-muted-foreground/50 rounded-xl h-11 text-base"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>
        <Button
          size="icon"
          onClick={handleSave}
          disabled={!value.trim()}
          className="h-11 w-11 rounded-xl bg-secondary/20 hover:bg-secondary/40 border border-secondary/30 shrink-0"
        >
          <Check className="w-5 h-5 text-secondary" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/60 text-center">{t.hint}</p>
    </div>
  );
};
