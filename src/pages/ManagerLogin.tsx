import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/boulevard-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";

const ManagerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);

  // Check if user came from password reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there's a session and we have recovery token indicators in URL
      if (session && (searchParams.get('type') === 'recovery' || window.location.hash.includes('type=recovery'))) {
        setIsResetPassword(true);
      }
    };
    
    // Also listen for auth state changes (for when user clicks reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
      }
    });

    checkSession();
    
    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        // Update password
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        toast.success("Fjalëkalimi u ndryshua me sukses! Tani mund të hyni.");
        setIsResetPassword(false);
        setNewPassword("");
      } else if (isForgotPassword) {
        // Password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/manager-login`,
        });

        if (error) throw error;

        toast.success("Kontrolloni email-in tuaj për link-un e rivendosjes së fjalëkalimit!");
        setIsForgotPassword(false);
      } else if (isSignUp) {
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
        const { data: roleData } = await (supabase as any)
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
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 backdrop-blur-[1px]" />

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <Card className="glass-premium p-10 w-full max-w-md shadow-[var(--shadow-float)] rounded-[2.5rem]">
          <div className="flex flex-col items-center mb-10">
            <img src={logo} alt="Logo" className="h-24 w-auto mb-6 drop-shadow-2xl" />
            <h1 className="text-3xl font-display font-bold gradient-text-gold mb-2">
              {isResetPassword ? "Ndrysho Fjalëkalimin" : isForgotPassword ? "Rivendos Fjalëkalimin" : isSignUp ? "Regjistrohu" : "Manager Login"}
            </h1>
            <p className="text-muted-foreground text-center font-medium">
              {isResetPassword
                ? "Shkruani fjalëkalimin tuaj të ri"
                : isForgotPassword 
                ? "Shkruani email-in tuaj për të rivendosur fjalëkalimin" 
                : isSignUp 
                ? "Krijo llogari të re për menaxhim" 
                : "Hyni në panelin premium të menaxhimit"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isResetPassword ? (
              <div>
                <Input
                  type="password"
                  placeholder="Fjalëkalimi i Ri"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass-premium h-14 rounded-2xl text-base"
                />
              </div>
            ) : (
              <>
                <div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-premium h-14 rounded-2xl text-base"
                  />
                </div>
                {!isForgotPassword && (
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass-premium h-14 rounded-2xl text-base"
                    />
                  </div>
                )}
              </>
            )}
            <Button type="submit" variant="gold" className="w-full h-14 text-lg font-display font-bold" disabled={loading}>
              <Lock className="mr-2 h-5 w-5" />
              {loading 
                ? (isResetPassword ? "Duke ndryshuar..." : isForgotPassword ? "Duke dërguar..." : isSignUp ? "Duke krijuar..." : "Duke u kyçur...") 
                : (isResetPassword ? "Ndrysho Fjalëkalimin" : isForgotPassword ? "Dërgo Link-un" : isSignUp ? "Regjistrohu" : "Kyçu")}
            </Button>
          </form>

          <div className="flex flex-col gap-3 mt-6">
            {!isForgotPassword && !isResetPassword && (
              <Button 
                variant="ghost" 
                className="w-full font-medium hover:bg-primary/5 rounded-2xl text-sm"
                onClick={() => setIsForgotPassword(true)}
              >
                Keni harruar fjalëkalimin?
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              className="w-full font-medium hover:bg-primary/5 rounded-2xl"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setIsForgotPassword(false);
              }}
            >
              {isSignUp ? "Keni llogari? Kyçuni" : "Nuk keni llogari? Regjistrohuni"}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full font-medium rounded-2xl"
              onClick={() => {
                setIsForgotPassword(false);
                navigate('/');
              }}
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
