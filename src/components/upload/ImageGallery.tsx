import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  image_url: string;
  file_name: string;
  uploaded_at: string;
}

interface ImageGalleryProps {
  title: string;
  images: GalleryImage[];
  onDelete: (id: string) => void;
}

const ImageGallery = ({ title, images, onDelete }: ImageGalleryProps) => {
  if (images.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-8"
    >
      <h2 className="text-xl font-display font-semibold text-foreground mb-4">
        {title} ({images.length})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {images.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl overflow-hidden group"
            >
              <div className="aspect-square relative">
                <img
                  src={img.image_url}
                  alt={img.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(img.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {img.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(img.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ImageGallery;
