import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import logo from "@/assets/universal-caffe-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

const Menu = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState("Tavolinë");
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    }
  }, [searchParams]);

  // Sample menu items - do të integrohet me backend më vonë
  const menuItems: MenuItem[] = [
    { id: "1", name: "Espresso", description: "Kafe e fortë italiane", price: 80, category: "Kafe" },
    { id: "2", name: "Cappuccino", description: "Espresso me qumësht dhe shkumë", price: 120, category: "Kafe" },
    { id: "3", name: "Macchiato", description: "Espresso me një pikë qumësht", price: 100, category: "Kafe" },
    { id: "4", name: "Latte", description: "Kafe me shumë qumësht", price: 130, category: "Kafe" },
    { id: "5", name: "Coca Cola", description: "330ml", price: 150, category: "Pije" },
    { id: "6", name: "Ujë Mineral", description: "500ml", price: 80, category: "Pije" },
    { id: "7", name: "Croissant", description: "Brumë francez i freskët", price: 120, category: "Ëmbëlsira" },
    { id: "8", name: "Tiramisu", description: "Ëmbëlsirë italiane klasike", price: 250, category: "Ëmbëlsira" },
  ];

  const categories = ["Kafe", "Pije", "Ëmbëlsira"];

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
        {categories.map(category => {
          const items = menuItems.filter(item => item.category === category);
          return (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 glass-effect rounded-xl p-3 inline-block">
                {category}
              </h2>
              <div className="grid gap-4">
                {items.map(item => (
                  <Card key={item.id} className="glass-effect p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-lg font-bold text-primary mt-2">{item.price} Lekë</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
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
        })}

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
                <Button size="lg" className="font-bold">
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
