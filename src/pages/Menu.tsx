import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, ShoppingCart, Languages, Clock, Flame } from "lucide-react";
import logo from "@/assets/boulevard-logo.png";
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
  group_name: string;
}

const isOfferActive = (item: MenuItem): boolean => {
  if (!item.offer_price || !item.offer_start_time || !item.offer_end_time) return false;
  const now = new Date();
  const romeTime = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false });
  const start = item.offer_start_time.slice(0, 5);
  const end = item.offer_end_time.slice(0, 5);
  // Handle overnight ranges (e.g. 22:00 - 02:00)
  if (start > end) {
    return romeTime >= start || romeTime <= end;
  }
  return romeTime >= start && romeTime <= end;
};

const getActivePrice = (item: MenuItem): number => {
  return isOfferActive(item) ? item.offer_price! : item.price;
};

const Menu = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  const [tableNumber, setTableNumber] = useState("");
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('BANAKU');
  const { checkLocation, checking } = useGeolocation();

  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
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
        .eq('available', true)
        .order('display_order', { ascending: true });
      if (itemsError) throw itemsError;

      setCategories(categoriesData || []);
      setMenuItems((itemsData as unknown as MenuItem[]) || []);
      if (categoriesData && categoriesData.length > 0) {
        const firstInGroup = categoriesData.find((c: Category) => c.group_name === 'BANAKU') || categoriesData[0];
        setSelectedCategoryId(firstInGroup.id);
        setSelectedGroup(firstInGroup.group_name || 'BANAKU');
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
    if (!tableNumber.trim()) {
      toast.error(language === 'sq' ? 'Shkruani numrin e tavolinës' : 'Enter the table number');
      return;
    }
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
          table_number: tableNumber.trim(),
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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(220 40% 8%) 50%, hsl(0 0% 5%) 100%)' }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + i * 2}px`,
              height: `${3 + i * 2}px`,
              background: `radial-gradient(circle, hsl(43 85% 55% / ${0.2 + i * 0.05}), transparent)`,
              left: `${10 + i * 25}%`,
              top: `${10 + (i % 2) * 40}%`,
              animation: `particle-float ${5 + i}s ease-in-out ${i * 0.7}s infinite`,
              filter: `blur(${1 + i * 0.5}px)`,
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, hsl(0 0% 0% / 0.5) 100%)' }}
      />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-6 rounded-2xl p-4 animate-in-stagger-1"
          style={{
            background: 'hsl(0 0% 100% / 0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid hsl(0 0% 100% / 0.08)',
            boxShadow: '0 10px 40px -10px hsl(0 0% 0% / 0.5)',
          }}
        >
          <button
            onClick={() => navigate(`/?tabela=${tableNumber}`)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              background: 'hsl(0 0% 100% / 0.06)',
              border: '1px solid hsl(0 0% 100% / 0.1)',
              color: 'hsl(43 85% 55%)',
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <div className="text-right">
              <p className="text-xs" style={{ color: 'hsl(220 10% 50%)' }}>{t.menu}</p>
              <p className="font-display font-bold text-sm gradient-text-gold">{tableNumber || t.table}</p>
            </div>
          </div>
          <button
            onClick={toggleLanguage}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              background: 'hsl(0 0% 100% / 0.06)',
              border: '1px solid hsl(0 0% 100% / 0.1)',
              color: 'hsl(43 85% 55%)',
            }}
          >
            <Languages className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl font-display" style={{ color: 'hsl(220 10% 55%)' }}>{t.loading}</p>
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide animate-in-stagger-2">
              {/* Group tabs (BANAKU / GUZHINA / DREKA) */}
              <div className="grid grid-cols-3 gap-2 mb-3 w-full">
                {['BANAKU', 'GUZHINA', 'DREKA'].map(group => (
                  <button
                    key={group}
                    onClick={() => {
                      setSelectedGroup(group);
                      const first = categories.find(c => c.group_name === group);
                      if (first) setSelectedCategoryId(first.id);
                    }}
                    className="w-full px-3 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-[0.2em] transition-all duration-300"
                    style={selectedGroup === group ? {
                      background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                      color: 'hsl(220 60% 10%)',
                      boxShadow: '0 0 24px hsl(43 85% 55% / 0.5)',
                      transform: 'scale(1.03)',
                    } : {
                      background: 'hsl(0 0% 100% / 0.06)',
                      color: 'hsl(43 85% 65%)',
                      border: '1px solid hsl(43 85% 55% / 0.25)',
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 pb-2">
                {categories.filter(c => c.group_name === selectedGroup).map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className="px-2 py-1.5 rounded-lg font-display font-bold text-[10px] leading-tight transition-all duration-300 text-center"
                    style={selectedCategoryId === category.id ? {
                      background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                      color: 'hsl(220 60% 10%)',
                      boxShadow: '0 0 20px hsl(43 85% 55% / 0.3)',
                      transform: 'scale(1.05)',
                    } : {
                      background: 'hsl(0 0% 100% / 0.06)',
                      color: 'hsl(0 0% 70%)',
                      border: '1px solid hsl(0 0% 100% / 0.08)',
                    }}
                  >
                    {language === 'en' && category.name_en ? category.name_en : category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            {selectedCategoryId && (
              <div className="grid grid-cols-2 gap-3 animate-in-stagger-3">
                {menuItems
                  .filter(item => item.category_id === selectedCategoryId)
                  .map(item => {
                    const offerActive = isOfferActive(item);
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl p-3 transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          background: 'hsl(0 0% 100% / 0.04)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid hsl(0 0% 100% / 0.08)',
                          boxShadow: '0 4px 20px -5px hsl(0 0% 0% / 0.4)',
                        }}
                      >
                        {item.image_url && (
                          <div className="w-full h-24 mb-2 rounded-xl overflow-hidden"
                            style={{ boxShadow: '0 4px 15px -5px hsl(0 0% 0% / 0.5)' }}
                          >
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col mb-2">
                          <h3 className="text-sm font-display font-bold mb-0.5 leading-tight" style={{ color: 'hsl(0 0% 90%)' }}>
                            {language === 'en' && item.name_en ? item.name_en : item.name}
                          </h3>
                          {item.description && (
                            <p className="text-xs mb-1 line-clamp-2" style={{ color: 'hsl(220 10% 45%)' }}>
                              {language === 'en' && item.description_en ? item.description_en : item.description}
                            </p>
                          )}

                          <div className="flex items-end justify-between gap-2 mt-1">
                            <div className="flex-1 min-w-0">
                          {offerActive ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs line-through" style={{ color: 'hsl(220 10% 45%)' }}>{item.price} {t.currency}</span>
                                <span className="text-sm font-bold flex items-center gap-1" style={{ color: 'hsl(0 70% 55%)' }}>
                                  <Flame className="h-3 w-3" />
                                  {item.offer_price} {t.currency}
                                </span>
                              </div>
                              <p className="text-xs flex items-center gap-1" style={{ color: 'hsl(0 70% 55% / 0.8)' }}>
                                <Clock className="h-3 w-3" />
                                {t.offerUntil} {item.offer_end_time?.slice(0, 5)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm font-bold gradient-text-gold">
                              {item.price} {t.currency}
                            </p>
                          )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                            {cart[item.id] ? (
                              <>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                  style={{
                                    background: 'hsl(0 0% 100% / 0.08)',
                                    border: '1px solid hsl(0 0% 100% / 0.12)',
                                    color: 'hsl(0 0% 80%)',
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="font-bold text-sm w-6 text-center" style={{ color: 'hsl(0 0% 90%)' }}>{cart[item.id]}</span>
                                <button
                                  onClick={() => addToCart(item.id)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                  style={{
                                    background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                                    color: 'hsl(220 60% 10%)',
                                    boxShadow: '0 0 10px hsl(43 85% 55% / 0.3)',
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToCart(item.id)}
                                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                                style={{
                                  background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                                  color: 'hsl(220 60% 10%)',
                                  boxShadow: '0 0 10px hsl(43 85% 55% / 0.3)',
                                }}
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <p className="text-center text-sm mt-6 italic" style={{ color: 'hsl(220 10% 40%)' }}>{t.priceDisclaimer}</p>
          </>
        )}

        {/* Cart Summary */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
            <div
              className="p-5 rounded-2xl animate-in-stagger-1"
              style={{
                background: 'hsl(0 0% 100% / 0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsl(43 85% 55% / 0.2)',
                boxShadow: '0 0 30px hsl(43 85% 55% / 0.15), 0 20px 60px -15px hsl(0 0% 0% / 0.7)',
              }}
            >
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
                          <span className="font-medium truncate" style={{ color: 'hsl(0 0% 85%)' }}>
                            {language === 'en' && item.name_en ? item.name_en : item.name}
                          </span>
                          <span style={{ color: 'hsl(220 10% 50%)' }}>×{qty}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-bold whitespace-nowrap gradient-text-gold">{price * qty} {t.currency}</span>
                          <button
                            onClick={() => removeFromCart(itemId)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                            style={{
                              background: 'hsl(0 70% 50% / 0.15)',
                              border: '1px solid hsl(0 70% 50% / 0.2)',
                              color: 'hsl(0 70% 65%)',
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid hsl(0 0% 100% / 0.08)' }} className="pt-3">
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    className="w-full h-16 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none"
                    style={{
                      background: 'hsl(0 0% 100% / 0.05)',
                      border: '1px solid hsl(0 0% 100% / 0.1)',
                      color: 'hsl(0 0% 85%)',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full p-2.5"
                      style={{
                        background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                        boxShadow: '0 0 15px hsl(43 85% 55% / 0.3)',
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" style={{ color: 'hsl(220 60% 10%)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(220 10% 50%)' }}>{getTotalItems()} {t.items}</p>
                      <p className="text-xl font-display font-bold gradient-text-gold">{getTotalPrice()} {t.currency}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={checking}
                    className="px-6 py-3 rounded-xl font-display font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, hsl(43 90% 55%), hsl(38 80% 45%))',
                      color: 'hsl(220 60% 10%)',
                      boxShadow: '0 0 20px hsl(43 85% 55% / 0.3)',
                    }}
                  >
                    {t.order}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {getTotalItems() > 0 && <div className="h-72" />}
      </div>
    </div>
  );
};

export default Menu;
