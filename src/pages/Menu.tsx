import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import logo from "@/assets/universal-caffe-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string | null;
  available: boolean;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
}

const Menu = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState("Tavolinë");
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (categoriesError) throw categoriesError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true);

      if (itemsError) throw itemsError;

      setCategories(categoriesData || []);
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error("Gabim në ngarkimin e menusë");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [itemId, count]) => {
      const item = menuItems.find(i => i.id === itemId);
      return sum + (item?.price || 0) * count;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          id: itemId,
          name: item?.name,
          price: item?.price,
          quantity,
          image_url: item?.image_url
        };
      });

      const { error } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber,
          items: orderItems,
          total_price: getTotalPrice(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Porosia u dërgua!", {
        description: "Kamarieri do ta sjellë së shpejti.",
        duration: 4000
      });

      // Clear cart and navigate back
      setCart({});
      navigate(`/?tabela=${tableNumber}`);
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error("Gabim në dërgimin e porosisë");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coffeeBackground})` }} />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 glass-effect rounded-2xl p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/?tabela=${tableNumber}`)}
            className="hover:scale-110 transition-transform"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Menu</p>
              <p className="font-semibold">{tableNumber}</p>
            </div>
          </div>
        </div>

        {/* Menu Categories */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-lg">Duke ngarkuar menunë...</p>
          </div>
        ) : (
          categories.map(category => {
            const items = menuItems.filter(item => item.category_id === category.id);
            return (
              <div key={category.id} className="mb-8">
                <h2 className="text-2xl font-bold mb-4 glass-effect rounded-xl p-3 inline-block">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map(item => (
                    <Card key={item.id} className="glass-effect p-4 hover:shadow-lg transition-shadow">
                      {item.image_url && (
                        <div className="w-full h-32 mb-3 rounded-lg overflow-hidden">
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-lg font-bold text-primary mt-2">{item.price} Lekë</p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2">
                          {cart[item.id] ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => removeFromCart(item.id)}
                                className="h-8 w-8"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-bold w-8 text-center">{cart[item.id]}</span>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => addToCart(item.id)}
                                className="h-8 w-8"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => addToCart(item.id)}
                              className="h-10 w-10"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Cart Summary - Fixed at bottom */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
            <Card className="glass-effect p-4 shadow-2xl border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary rounded-full p-2">
                    <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{getTotalItems()} artikuj</p>
                    <p className="text-xl font-bold">{getTotalPrice()} Lekë</p>
                  </div>
                </div>
                <Button size="lg" className="font-bold" onClick={handleSubmitOrder}>
                  Porosit
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Spacer for fixed cart */}
        {getTotalItems() > 0 && <div className="h-32" />}
      </div>
    </div>
  );
};

export default Menu;
