import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/universal-caffe-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";

const ManagerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast.success("Llogaria u krijua! Tani mund të hyni.");
        setIsSignUp(false);
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check if user has manager role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'manager')
          .single();

        if (!roleData) {
          await supabase.auth.signOut();
          throw new Error('Nuk keni akses si menaxher');
        }

        toast.success("Mirë se vini!");
        navigate('/manager');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || "Gabim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coffeeBackground})` }} />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <Card className="glass-effect p-8 w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Logo" className="h-20 w-auto mb-4" />
            <h1 className="text-2xl font-bold">{isSignUp ? "Regjistrohu" : "Manager Login"}</h1>
            <p className="text-muted-foreground">
              {isSignUp ? "Krijo llogari të re" : "Hyni në panelin e menaxhimit"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-effect"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-effect"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? (isSignUp ? "Duke krijuar..." : "Duke u kyçur...") : (isSignUp ? "Regjistrohu" : "Kyçu")}
            </Button>
          </form>

          <div className="flex flex-col gap-2 mt-4">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Keni llogari? Kyçuni" : "Nuk keni llogari? Regjistrohuni"}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Kthehu prapa
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ManagerLogin;
