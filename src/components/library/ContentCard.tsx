import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Loader2, Download, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import ImageLightbox from "./ImageLightbox";

type ContentStatus = Database["public"]["Enums"]["content_status"];

interface ContentCardProps {
  item: any;
  index: number;
  isRegenerating: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onOpenRegenerateDialog: (contentId: string, fabricId: string, imageUrl: string) => void;
  onDownload: (item: any) => void;
}

const ContentCard = ({
  item,
  index,
  isRegenerating,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onOpenRegenerateDialog,
  onDownload,
}: ContentCardProps) => {
  const fabric = item.fabric_images as any;
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

  return (
    <>
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05 }}
        className={`glass-card rounded-2xl overflow-hidden transition-all ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
      >
      <div className="flex flex-col md:flex-row">
        {/* Images */}
        <div className="md:w-2/5">
          <div className="flex flex-row">
            <div
              className="w-1/2 aspect-square relative group cursor-pointer"
              onClick={() => setLightbox({ url: fabric?.image_url, label: "Fabric" })}
            >
              <img
                src={fabric?.image_url}
                alt="Fabric"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-background opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
              <span className="absolute bottom-2 left-2 text-xs bg-foreground/70 text-background px-2 py-1 rounded-md">
                Fabric
              </span>
            </div>
            <div
              className="w-1/2 aspect-square relative group cursor-pointer"
              onClick={() =>
                item.model_image_url &&
                setLightbox({ url: item.model_image_url, label: "AI Model" })
              }
            >
              {item.model_image_url ? (
                <>
                  <img
                    src={item.model_image_url}
                    alt="AI Generated"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-5 h-5 text-background opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              )}
              <span className="absolute bottom-2 left-2 text-xs bg-foreground/70 text-background px-2 py-1 rounded-md">
                AI Model
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(item.id)}
                aria-label="Select content"
              />
              <div>
                <p className="text-sm text-muted-foreground">{fabric?.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                item.status === "pending"
                  ? "status-badge-pending"
                  : item.status === "approved"
                  ? "status-badge-approved"
                  : "status-badge-rejected"
              }`}
            >
              {item.status === "pending"
                ? "Pending Review"
                : item.status === "approved"
                ? "Approved"
                : "Rejected"}
            </span>
          </div>

          {/* Captions */}
          {item.caption_hindi && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                हिंदी
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {item.caption_hindi}
              </p>
            </div>
          )}
          {item.caption_english && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                English
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {item.caption_english}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-border">
            {item.status !== "approved" && (
              <Button
                size="sm"
                className="bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => onUpdateStatus(item.id, "approved")}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
            )}
            {item.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => onUpdateStatus(item.id, "rejected")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={isRegenerating}
              onClick={() => onOpenRegenerateDialog(item.id, item.fabric_id, fabric?.image_url)}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Regenerate
            </Button>
            {item.status === "approved" && item.model_image_url && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onDownload(item)}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>
      </motion.div>

      <ImageLightbox
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
        imageUrl={lightbox?.url || null}
        label={lightbox?.label}
      />
    </>
  );
};

export default ContentCard;
