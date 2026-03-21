import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Minus, ShoppingCart, Languages, Clock, Flame } from "lucide-react";
import logo from "@/assets/boulevard-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useGeolocation } from "@/hooks/use-geolocation";

const translations = {
  sq: {
    menu: "Menu",
    table: "Tavolinë",
    loading: "Duke ngarkuar menunë...",
    items: "artikuj",
    order: "Porosit",
    successOrder: "Porosia u dërgua!",
    successOrderDesc: "Kamarieri do ta sjellë së shpejti.",
    error: "Gabim",
    errorLoading: "Gabim në ngarkimin e menusë",
    errorOrder: "Gabim në dërgimin e porosisë",
    notesPlaceholder: "Shënime shtesë për porosinë (opsionale)...",
    priceDisclaimer: "* Çmimet mund të jenë subjekt ndryshimesh",
    offerUntil: "Ofertë deri në",
    currency: "Lekë",
    geoRequired: "Duhet të jeni në lokal për të porositur",
  },
  en: {
    menu: "Menu",
    table: "Table",
    loading: "Loading menu...",
    items: "items",
    order: "Order",
    successOrder: "Order sent!",
    successOrderDesc: "The waiter will bring it shortly.",
    error: "Error",
    errorLoading: "Error loading menu",
    errorOrder: "Error submitting order",
    notesPlaceholder: "Additional notes for your order (optional)...",
    priceDisclaimer: "* Prices may be subject to change",
    offerUntil: "Offer until",
    currency: "ALL",
    geoRequired: "You must be at the café to place an order",
  }
};

interface MenuItem {
  id: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  available: boolean;
  offer_price: number | null;
  offer_start_time: string | null;
  offer_end_time: string | null;
}

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  display_order: number;
}

const isOfferActive = (item: MenuItem): boolean => {
  if (!item.offer_price || !item.offer_start_time || !item.offer_end_time) return false;
  const now = new Date();
  // Use Rome/Italy timezone
  const romeTime = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false });
  return romeTime >= item.offer_start_time.slice(0, 5) && romeTime <= item.offer_end_time.slice(0, 5);
};

const getActivePrice = (item: MenuItem): number => {
  return isOfferActive(item) ? item.offer_price! : item.price;
};

const Menu = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  const [tableNumber, setTableNumber] = useState(t.table);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { checkLocation, checking } = useGeolocation();

  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    } else {
      setTableNumber(t.table);
    }
  }, [searchParams, t.table]);

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
      setMenuItems((itemsData as unknown as MenuItem[]) || []);
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error(t.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) newCart[itemId]--;
      else delete newCart[itemId];
      return newCart;
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((sum, c) => sum + c, 0);

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [itemId, count]) => {
      const item = menuItems.find(i => i.id === itemId);
      if (!item) return sum;
      return sum + getActivePrice(item) * count;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    // GPS check only when ordering
    const geoResult = await checkLocation(language);
    if (!geoResult.allowed) {
      toast.error(geoResult.error || t.geoRequired);
      return;
    }

    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          id: itemId,
          name: item?.name,
          price: item ? getActivePrice(item) : 0,
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
          status: 'pending',
          notes: orderNotes || null
        });

      if (error) throw error;

      toast.success(t.successOrder, {
        description: t.successOrderDesc,
        duration: 4000
      });

      setCart({});
      setOrderNotes("");
      navigate(`/?tabela=${tableNumber}`);
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(t.errorOrder);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coffeeBackground})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 glass-premium rounded-3xl p-5 shadow-[var(--shadow-elegant)]">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/?tabela=${tableNumber}`)} className="hover:scale-110 hover:bg-primary/10 transition-all rounded-2xl">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-12 w-auto" />
            <div className="text-right">
              <p className="text-sm text-muted-foreground font-medium">{t.menu}</p>
              <p className="font-display font-bold text-lg">{tableNumber}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleLanguage} className="hover:scale-110 hover:bg-primary/10 transition-all rounded-2xl">
            <Languages className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl font-display">{t.loading}</p>
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 min-w-max pb-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-6 py-3 rounded-2xl font-display font-bold text-base transition-all duration-300 whitespace-nowrap ${
                      selectedCategoryId === category.id
                        ? 'bg-white text-foreground shadow-[var(--shadow-gold)] scale-105'
                        : 'bg-white/80 text-foreground hover:scale-105 hover:shadow-[var(--shadow-elegant)]'
                    }`}
                  >
                    {language === 'en' && category.name_en ? category.name_en : category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            {selectedCategoryId && (
              <div className="grid grid-cols-2 gap-3">
                {menuItems
                  .filter(item => item.category_id === selectedCategoryId)
                  .map(item => {
                    const offerActive = isOfferActive(item);
                    return (
                      <Card key={item.id} className="glass-premium p-3 hover:shadow-[var(--shadow-float)] transition-all duration-500 rounded-2xl">
                        {item.image_url && (
                          <div className="w-full h-24 mb-2 rounded-xl overflow-hidden shadow-md">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col mb-2">
                          <div>
                            <h3 className="text-sm font-display font-bold mb-0.5 leading-tight">
                              {language === 'en' && item.name_en ? item.name_en : item.name}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                                {language === 'en' && item.description_en ? item.description_en : item.description}
                              </p>
                            )}
                            
                            {/* Price with offer display */}
                            {offerActive ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm line-through text-muted-foreground">{item.price} {t.currency}</span>
                                  <span className="text-xl font-bold text-destructive flex items-center gap-1">
                                    <Flame className="h-4 w-4" />
                                    {item.offer_price} {t.currency}
                                  </span>
                                </div>
                                <p className="text-xs text-destructive/80 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {t.offerUntil} {item.offer_end_time?.slice(0, 5)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xl font-bold gradient-text-gold">
                                {item.price} {t.currency}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-3">
                            {cart[item.id] ? (
                              <>
                                <Button variant="outline" size="icon" onClick={() => removeFromCart(item.id)} className="h-10 w-10 rounded-xl">
                                  <Minus className="h-5 w-5" />
                                </Button>
                                <span className="font-bold text-lg w-10 text-center">{cart[item.id]}</span>
                                <Button variant="gold" size="icon" onClick={() => addToCart(item.id)} className="h-10 w-10 rounded-xl">
                                  <Plus className="h-5 w-5" />
                                </Button>
                              </>
                            ) : (
                              <Button variant="gold" size="icon" onClick={() => addToCart(item.id)} className="h-12 w-12 rounded-2xl">
                                <Plus className="h-6 w-6" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6 italic">{t.priceDisclaimer}</p>
          </>
        )}

        {/* Cart Summary */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
            <Card className="glass-premium p-5 shadow-[var(--shadow-float)] border-2 border-secondary/30 rounded-3xl animate-pulse-glow">
              <div className="space-y-3">
                {/* Cart items list */}
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {Object.entries(cart).map(([itemId, qty]) => {
                    const item = menuItems.find(i => i.id === itemId);
                    if (!item) return null;
                    const price = getActivePrice(item);
                    return (
                      <div key={itemId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {language === 'en' && item.name_en ? item.name_en : item.name}
                          </span>
                          <span className="text-muted-foreground">×{qty}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-bold whitespace-nowrap">{price * qty} {t.currency}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(itemId)} className="h-7 w-7 rounded-lg hover:bg-destructive/20">
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border/30 pt-3">
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    className="w-full h-16 rounded-2xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="gradient-gold rounded-full p-2.5 shadow-[var(--shadow-gold)]">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{getTotalItems()} {t.items}</p>
                      <p className="text-xl font-display font-bold gradient-text-gold">{getTotalPrice()} {t.currency}</p>
                    </div>
                  </div>
                  <Button size="lg" variant="burgundy" className="font-display font-bold text-lg" onClick={handleSubmitOrder} disabled={checking}>
                    {t.order}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {getTotalItems() > 0 && <div className="h-36" />}
      </div>
    </div>
  );
};

export default Menu;
