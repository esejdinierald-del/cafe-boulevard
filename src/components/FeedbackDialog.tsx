import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  language: "sq" | "en";
}

const t = {
  sq: {
    title: "Na Vlerësoni",
    subtitle: "Si ishte përvoja juaj?",
    comment: "Koment (opsional)...",
    send: "Dërgo Vlerësimin",
    thanks: "Faleminderit!",
    thanksDesc: "Vlerësimi juaj u dërgua me sukses.",
    error: "Gabim në dërgimin e vlerësimit",
    tapStar: "Prekni yjet për të vlerësuar",
  },
  en: {
    title: "Rate Us",
    subtitle: "How was your experience?",
    comment: "Comment (optional)...",
    send: "Submit Rating",
    thanks: "Thank you!",
    thanksDesc: "Your feedback was submitted successfully.",
    error: "Error submitting feedback",
    tapStar: "Tap stars to rate",
  },
};

export const FeedbackDialog = ({ open, onOpenChange, tableNumber, language }: FeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tr = t[language];

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        table_number: tableNumber,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success(tr.thanks, { description: tr.thanksDesc });
      setRating(0);
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(tr.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-premium rounded-3xl border-secondary/20 max-w-sm mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-display font-bold gradient-text-gold">
            {tr.title}
          </DialogTitle>
          <p className="text-muted-foreground">{tr.subtitle}</p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-transform duration-200 hover:scale-125 active:scale-95"
              >
                <Star
                  className={`h-10 w-10 transition-colors duration-200 ${
                    star <= (hoveredStar || rating)
                      ? "fill-secondary text-secondary"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating === 0 && (
            <p className="text-center text-sm text-muted-foreground italic">{tr.tapStar}</p>
          )}

          {/* Comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={tr.comment}
            className="glass-premium rounded-2xl resize-none h-24"
            maxLength={500}
          />

          {/* Submit */}
          <Button
            variant="gold"
            size="lg"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full h-14 text-lg font-display font-bold rounded-2xl"
          >
            {tr.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
