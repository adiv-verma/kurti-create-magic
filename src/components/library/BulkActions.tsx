import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}

const BulkActions = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
}: BulkActionsProps) => {
  if (totalCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between glass-card rounded-xl px-4 py-3 mb-4"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
          className="text-sm font-medium text-primary hover:underline"
        >
          {selectedCount === totalCount ? "Deselect all" : "Select all"}
        </button>
        {selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedCount} of {totalCount} selected
          </span>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={onBulkApprove}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve ({selectedCount})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={onBulkReject}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject ({selectedCount})
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default BulkActions;
