import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Upload, Image, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalFabrics: 0,
    totalGenerated: 0,
    pending: 0,
    approved: 0,
  });
  const [recentContent, setRecentContent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [fabricRes, genRes, pendingRes, approvedRes, recentRes] = await Promise.all([
        supabase.from("fabric_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
        supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase
          .from("generated_content")
          .select("*, fabric_images(image_url, file_name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      setStats({
        totalFabrics: fabricRes.count ?? 0,
        totalGenerated: genRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
      });

      if (recentRes.data) setRecentContent(recentRes.data);
    };

    fetchStats();
  }, [user]);

  const statCards = [
    { label: "Fabric Uploads", value: stats.totalFabrics, icon: Upload, color: "text-primary" },
    { label: "Total Generated", value: stats.totalGenerated, icon: Image, color: "text-accent" },
    { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-success" },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            Welcome{profile?.business_name ? `, ${profile.business_name}` : ""}
          </h1>
          <p className="text-muted-foreground mb-8">Here's your content generation overview</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-xl p-5"
            >
              <card.icon className={`w-5 h-5 ${card.color} mb-3`} />
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link to="/upload">
            <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-1">Upload Fabric</h3>
                  <p className="text-sm text-muted-foreground">Add new fabric images to generate content</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
          <Link to="/library">
            <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-1">Review Content</h3>
                  <p className="text-sm text-muted-foreground">Approve or reject AI-generated content</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
        </div>

        {/* Recent content */}
        {recentContent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-foreground">Recent Generations</h2>
              <Link to="/library">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recentContent.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="glass-card rounded-xl overflow-hidden"
                >
                  <div className="aspect-square relative">
                    <img
                      src={item.model_image_url || (item.fabric_images as any)?.image_url}
                      alt="Generated content"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.status === "pending" ? "status-badge-pending"
                        : item.status === "approved" ? "status-badge-approved"
                        : "status-badge-rejected"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
